/**
 * Script tự động hóa các hành động bảo mật:
 * 1. Chạy migrate.sql từng statement - bỏ qua lỗi "already exists"
 * 2. Cập nhật JWT_SECRET mới trong .env
 */

const { Pool } = require('../backend/node_modules/pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * Split SQL into individual statements, respecting $$ dollar-quote blocks (PL/pgSQL DO blocks)
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let lines = sql.split('\n');

  for (const line of lines) {
    // Skip pure comment lines and blank lines for splitting purposes, but keep them in current stmt
    current += line + '\n';

    // Detect $$ toggle
    const dollarCount = (line.match(/\$\$/g) || []).length;
    if (dollarCount % 2 !== 0) {
      inDollarQuote = !inDollarQuote;
    }

    // If we're not inside a $$ block and line ends with ;
    if (!inDollarQuote && line.trimEnd().endsWith(';')) {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
    }
  }

  // Catch any trailing statement
  if (current.trim()) {
    statements.push(current.trim());
  }

  return statements;
}

const IGNORABLE_ERRORS = [
  'already exists',
  'does not exist',
  'duplicate key',
  'there is no unique constraint',
  'multiple primary keys',
  'relation already exists',
];

function isIgnorable(errMsg) {
  return IGNORABLE_ERRORS.some(e => errMsg.toLowerCase().includes(e));
}

async function runMigration() {
  console.log('\n📦 Step 1: Running migrate.sql (statement by statement)...');
  const migrateSql = fs.readFileSync(path.join(__dirname, '../migrate.sql'), 'utf8');
  const statements = splitSqlStatements(migrateSql);
  
  console.log(`   Found ${statements.length} statements to execute\n`);

  const client = await pool.connect();
  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      // Show first 80 chars as preview
      const preview = stmt.replace(/\s+/g, ' ').substring(0, 80);
      try {
        const result = await client.query(stmt);
        // Check for SELECT 'Migration completed successfully'
        if (result.rows && result.rows[0]?.result) {
          console.log(`   ✅ [${i + 1}/${statements.length}] ${result.rows[0].result}`);
        } else {
          successCount++;
        }
      } catch (err) {
        if (isIgnorable(err.message)) {
          console.log(`   ⚠️  [${i + 1}/${statements.length}] Skipped (already applied): ${preview.substring(0, 60)}...`);
          skippedCount++;
        } else {
          console.error(`   ❌ [${i + 1}/${statements.length}] Error: ${err.message}`);
          console.error(`      Statement: ${preview}...`);
          errorCount++;
        }
      }
    }
  } finally {
    client.release();
  }

  console.log(`\n   Migration summary: ✅ ${successCount} applied | ⚠️  ${skippedCount} skipped | ❌ ${errorCount} errors`);
  if (errorCount > 0) {
    console.log('   ⚠️  Some statements failed. Review errors above.');
  } else {
    console.log('   ✅ Migration completed successfully!');
  }
}

function updateEnvJwtSecret() {
  console.log('\n🔑 Step 2: Generating new JWT_SECRET...');
  const newSecret = crypto.randomBytes(64).toString('hex');
  
  const envPath = path.join(__dirname, '../backend/.env');
  let content = fs.readFileSync(envPath, 'utf8');
  
  if (content.match(/JWT_SECRET=.+/)) {
    content = content.replace(/JWT_SECRET=.+/, `JWT_SECRET=${newSecret}`);
    fs.writeFileSync(envPath, content, 'utf8');
    console.log('✅ JWT_SECRET updated in .env');
    console.log(`   New secret: ${newSecret.substring(0, 16)}...${newSecret.slice(-8)}`);
    console.log('\n⚠️  All existing user sessions are now invalidated.');
    console.log('   Users will need to log in again after restarting backend.\n');
  } else {
    // Append if not found
    fs.appendFileSync(envPath, `\nJWT_SECRET=${newSecret}\n`);
    console.log('✅ JWT_SECRET added to .env');
  }
}

async function main() {
  console.log('🚀 EduSchedule Security Automation Script');
  console.log('==========================================');
  
  try {
    await runMigration();
    updateEnvJwtSecret();
    
    console.log('\n==========================================');
    console.log('✅ Automation complete!\n');
    console.log('📋 Remaining MANUAL steps (external services):');
    console.log('');
    console.log('1. 🔴 ROTATE NEON DATABASE PASSWORD:');
    console.log('   → https://console.neon.tech/ → Settings → Reset password');
    console.log('   → Update DATABASE_URL in backend/.env');
    console.log('');
    console.log('2. 🔴 ROTATE GMAIL APP PASSWORD (SMTP_PASS):');
    console.log('   → https://myaccount.google.com/apppasswords');
    console.log('   → Revoke old → Create new → Update SMTP_PASS in backend/.env');
    console.log('');
    console.log('3. 🔴 ROTATE GOOGLE OAUTH CLIENT SECRET:');
    console.log('   → https://console.cloud.google.com/apis/credentials');
    console.log('   → Select OAuth Client → RESET SECRET');
    console.log('   → Update GOOGLE_CLIENT_SECRET in backend/.env');
    console.log('');
    console.log('4. 🔴 CLEAN GIT HISTORY (requires Python + git-filter-repo):');
    console.log('   pip install git-filter-repo');
    console.log('   git filter-repo --path backend/.env --invert-paths --force');
    console.log('   git push origin --force --all');
    console.log('');
    console.log('5. 🔄 RESTART backend server to apply new JWT_SECRET');
    
  } catch (err) {
    console.error('\n❌ Script failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
