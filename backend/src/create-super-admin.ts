import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  try {
    // 1. Create a System Tenant if not exists
    const tenantResult = await pool.query(
      "INSERT INTO tenants (name, plan_id, domain) VALUES ('System Administration', 'ffffffff-0000-0000-0000-000000000004', 'system') ON CONFLICT (domain) DO UPDATE SET name = 'System Administration' RETURNING id"
    );
    const tenantId = tenantResult.rows[0].id;

    // 2. Create Super Admin User
    const email = process.env.SUPERADMIN_EMAIL || 'superadmin@eduschedule.com';
    const password = process.env.SUPERADMIN_PASSWORD || 'Admin@123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_email_verified) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, email) DO UPDATE SET role = 'super_admin', is_email_verified = true`,
      [tenantId, email, hashedPassword, 'System Super Admin', 'super_admin', true]
    );

    console.log('--- Super Admin Account Created ---');
    console.log(`Email: ${email}`);
    if (process.env.NODE_ENV === 'development' || !process.env.SUPERADMIN_PASSWORD) {
      console.log(`Password: ${password}`);
    } else {
      console.log(`Password: ******** (set via ENV)`);
    }
    console.log('-----------------------------------');
    process.exit(0);
  } catch (err) {
    console.error('Error creating super admin:', err);
    process.exit(1);
  }
}

setup();
