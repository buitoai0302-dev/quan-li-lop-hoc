import pool from '../src/db';

async function main() {
  try {
    await pool.query(`
      INSERT INTO users (id, tenant_id, branch_id, email, password_hash, full_name, role, is_email_verified) 
      VALUES (
        '33333333-0000-0000-0000-000000000001', 
        '00000000-0000-0000-0000-000000000001', 
        NULL, 
        'superadmin@eduschedule.com', 
        '$2b$10$tEfz1SbXlnQgoItiSSbapew27RHf7IwqjSNjWmzOoE1nScWQiq.qO', 
        'Super Administrator', 
        'super_admin',
        TRUE
      )
      ON CONFLICT (tenant_id, email) DO UPDATE SET role = 'super_admin', is_email_verified = TRUE, password_hash = '$2b$10$tEfz1SbXlnQgoItiSSbapew27RHf7IwqjSNjWmzOoE1nScWQiq.qO';
    `);
    console.log("Superadmin created successfully!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
main();
