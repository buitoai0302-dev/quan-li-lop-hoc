import pool from '../src/db';
import bcrypt from 'bcrypt';

async function main() {
  try {
    const hash = await bcrypt.hash('123456', 10);
    await pool.query(
      `UPDATE users SET password_hash = $1 WHERE email = 'superadmin@eduschedule.com'`,
      [hash]
    );
    console.log("Password updated to 123456 successfully!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
main();
