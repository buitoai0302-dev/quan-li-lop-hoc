import pool from '../src/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../src/services/email.service';

// Finds accounts whose bcrypt hash matches the former email-prefix default.
// Dry-run by default. Run on staging first; use --apply only after reviewing the count.
async function rotate() {
  const apply = process.argv.includes('--apply');
  const users = await pool.query('SELECT id, email, password_hash FROM users WHERE is_active = true');
  let matches = 0;
  let rotated = 0;
  for (const user of users.rows) {
    const legacyPassword = user.email.split('@')[0];
    if (!(await bcrypt.compare(legacyPassword, user.password_hash))) continue;
    matches++;
    if (!apply) continue;

    const token = crypto.randomUUID();
    const hash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, reset_password_token = $2,
         reset_password_expires = NOW() + INTERVAL '24 hours'
       WHERE id = $3 AND password_hash = $4 RETURNING id`,
      [hash, token, user.id, user.password_hash]
    );
    if (result.rows.length === 0) continue;
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);
    await sendPasswordResetEmail(user.email, token);
    rotated++;
  }
  console.log(apply ? `Rotated ${rotated} of ${matches} matching accounts` :
    `Dry-run: ${matches} accounts match the old predictable password`);
  await pool.end();
}

rotate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
