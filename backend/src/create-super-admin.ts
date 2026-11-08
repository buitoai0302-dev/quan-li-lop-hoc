import { logger } from './utils/logger';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

async function setup() {
  try {
    const email = process.env.SUPERADMIN_EMAIL;
    const password = process.env.SUPERADMIN_PASSWORD;
    if (
      !email ||
      !password ||
      password.length < 16 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      throw new Error('Set SUPERADMIN_EMAIL and a strong SUPERADMIN_PASSWORD (16+ characters)');
    }
    const planResult = await pool.query(
      "SELECT id FROM plan_definitions WHERE code = 'ENTERPRISE'"
    );
    const enterprisePlanId = planResult.rows[0]?.id;
    if (!enterprisePlanId)
      throw new Error('ENTERPRISE plan is required before creating the system tenant');

    // 1. Create a System Tenant if not exists
    const tenantResult = await pool.query(
      "INSERT INTO tenants (name, plan_id, domain) VALUES ('System Administration', $1, 'system') ON CONFLICT (domain) DO UPDATE SET name = 'System Administration' RETURNING id",
      [enterprisePlanId]
    );
    const tenantId = tenantResult.rows[0].id;

    // 2. Create Super Admin User
    const hashedPassword = await bcrypt.hash(password, 12);

    const created = await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_email_verified) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, email) DO NOTHING RETURNING id`,
      [tenantId, email, hashedPassword, 'System Super Admin', 'super_admin', true]
    );

    logger.info(
      { email },
      created.rowCount
        ? 'Super Admin account created'
        : 'Super Admin account already exists; no changes made'
    );
  } catch (err) {
    logger.error(err, 'Error creating super admin:');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

setup();
