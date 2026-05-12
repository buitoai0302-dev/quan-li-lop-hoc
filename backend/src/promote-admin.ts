import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const email = process.argv[2];

if (!email) {
  console.error('Please provide an email: npm run promote -- your-email@example.com');
  process.exit(1);
}

async function promote() {
  try {
    const result = await pool.query(
      "UPDATE users SET role = 'super_admin' WHERE email = $1 RETURNING id, full_name, role",
      [email]
    );

    if (result.rowCount === 0) {
      console.error(`User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`Success! User ${result.rows[0].full_name} is now a Super Admin.`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to promote user:', err);
    process.exit(1);
  }
}

promote();
