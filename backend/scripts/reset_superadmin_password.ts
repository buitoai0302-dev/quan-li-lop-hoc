import pool from '../src/db';
import bcrypt from 'bcrypt';

// Supply both values through the environment. Never put a reset password in source control.
async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_NEW_PASSWORD;
  if (!email || !password || password.length < 16 || !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Set SUPERADMIN_EMAIL and a strong SUPERADMIN_NEW_PASSWORD (16+ characters)');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const account = await client.query(
      'SELECT id FROM users WHERE email = $1 AND role = $2 FOR UPDATE',
      [email, 'super_admin']
    );
    if (account.rowCount !== 1) throw new Error('Expected exactly one Super Admin account');

    const hash = await bcrypt.hash(password, 12);
    await client.query(
      `UPDATE users SET password_hash = $1, reset_password_token = NULL,
       reset_password_expires = NULL WHERE id = $2`,
      [hash, account.rows[0].id]
    );
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [account.rows[0].id]);
    await client.query('COMMIT');
    console.log('Super Admin password updated; refresh sessions revoked.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Password reset failed');
  process.exitCode = 1;
}).finally(() => pool.end());
