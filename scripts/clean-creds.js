const fs = require('fs');

const filesToClean = [
  // These JS utility scripts hardcoded credentials in the initial commit
  'backend/seed_users.js',
  'backend/sync_accounts.js',
  'backend/test_alice_query.js',
  'backend/migrate.js',
  'backend/add_is_deleted.js',
  'backend/check_sessions.js',
  'backend/check_weekly.js',
  'backend/run_dummy_seed.js',
  // Source files
  'backend/src/db.ts',
  'backend/src/db.js',
  // QA report that quoted credentials in findings
  'QA_REPORT.md',
];

const replacements = [
  // Remove hardcoded Neon DB password
  {
    pattern: /postgresql:\/\/neondb_owner:npg_[A-Za-z0-9]+@/g,
    replacement: 'postgresql://neondb_owner:REDACTED@'
  },
  // Remove hardcoded connection strings with full URL
  {
    pattern: /'postgresql:\/\/neondb_owner:[^']+'/g,
    replacement: "'process.env.DATABASE_URL'"
  },
  {
    pattern: /"postgresql:\/\/neondb_owner:[^"]+"/g,
    replacement: '"process.env.DATABASE_URL"'
  },
  // Remove Gmail App Password
  {
    pattern: /prygaujiljllbcpy/g,
    replacement: 'REDACTED'
  },
  // Remove Google Client Secret pattern
  {
    pattern: /GOCSPX-[A-Za-z0-9_-]+/g,
    replacement: 'REDACTED'
  }
];

let cleaned = 0;

filesToClean.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    replacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        changed = true;
      }
      pattern.lastIndex = 0; // Reset regex state
    });
    
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      cleaned++;
      console.log('Cleaned: ' + filePath);
    }
  }
});

process.exit(0);
