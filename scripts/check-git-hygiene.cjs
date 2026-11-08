const { execFileSync } = require('node:child_process');
const { lstatSync, readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const credentialVariable = 'JWT_SECRET|JWT_REFRESH_SECRET|SUPERADMIN_PASSWORD|SMTP_PASS|FIREBASE_PRIVATE_KEY|MOMO_SECRET_KEY|VNPAY_HASH_SECRET|BACKUP_ENCRYPTION_KEY';
const literalCredential = new RegExp(
  `(?:process\\.env\\.(?:${credentialVariable})\\s*(?:\\|\\||\\?\\?|=(?!=))|(?:const|let|var)\\s+(?:${credentialVariable})\\s*=)\\s*(['"])[^'"\\r\\n]+\\1`
);
const worktree = process.argv.includes('--worktree');
const baseIndex = process.argv.indexOf('--base');
const base = baseIndex >= 0 ? process.argv[baseIndex + 1] : undefined;
const problems = new Map();

function git(args, allowedStatus = []) {
  try {
    return execFileSync('git', args, {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    if (allowedStatus.includes(error.status)) return '';
    // Git stderr can include source content. Report the operation only.
    throw new Error(`git ${args[0]} failed (exit ${error.status ?? 'unknown'})`);
  }
}

const splitPaths = (output) => output.split('\0').filter(Boolean);
const report = (file, reason) => {
  const reasons = problems.get(file) || new Set();
  reasons.add(reason);
  problems.set(file, reasons);
};

function privatePath(file) {
  const name = path.posix.basename(file.toLowerCase());
  if (name.startsWith('.env')) return name !== '.env.example';
  if (name.endsWith('.example.json')) return false;
  return /^(?:recovery-codes\.txt|qa_pilot_report\.md|security_review_report\.md)$/.test(name) ||
    /(?:credentials|service[-_]account|firebase-adminsdk|secrets).*\.json$/.test(name) ||
    /(?:\.local\.json|\.pem|\.key|\.p12|\.pfx|\.dump(?:\.gz)?|\.bak|\.sql\.(?:gz|enc))$/.test(name);
}

function scan(file, source) {
  if (/-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/.test(source)) {
    report(file, 'private key');
  }
  if (/\b(?:AIza[\w-]{35}|gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[\w]{40,}|(?:AKIA|ASIA)[A-Z0-9]{16}|xox[baprs]-[\w-]{12,})\b/.test(source)) {
    report(file, 'provider credential pattern');
  }
  if (/^backend\/(?:src|scripts)\/.*\.[cm]?[jt]s$/i.test(file) && literalCredential.test(source)) {
    report(file, 'hardcoded credential assignment or fallback');
  }
  for (const match of source.matchAll(/postgres(?:ql)?:\/\/[^\s"'\x60<>]+/gi)) {
    let url;
    try {
      url = new URL(match[0]);
    } catch {
      continue;
    }
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    const example = /(?:^|\.)(?:example\.com|example|invalid|test)$/.test(url.hostname);
    const sampleUser = /^(?:user|username|db_user|your[_-]username|postgres|ci)$/i.test(url.username);
    const samplePassword = /^(?:password|pass|db_password|your[_-]password|replace[_-]?me|change[_-]?me)$/i.test(url.password);
    if (url.password && !local && !(example && sampleUser && samplePassword)) {
      report(file, 'PostgreSQL URL with password');
    }
  }
  if (/(?:^|\/)\.env\.example$/i.test(file)) {
    for (const line of source.split(/\r?\n/)) {
      const assignment = line.match(/^\s*([A-Z][A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|API_KEY|PRIVATE_KEY|ACCESS_KEY|ENCRYPTION_KEY)[A-Z0-9_]*)\s*=\s*(.*)$/);
      if (!assignment) continue;
      const sample = assignment[2].replace(/\s+#.*$/, '').trim().replace(/^(["'])(.*)\1$/, '$2');
      if (sample && !/^(?:your[_-].+|replace[_-].+|change[_-].+|example[_-].+|<[^>]+>|x{3,})$/i.test(sample)) {
        report(file, `non-placeholder ${assignment[1]}`);
      }
    }
  }
}

try {
  const tracked = splitPaths(git(['ls-files', '-z', '--cached']));
  const ignoredTracked = splitPaths(git(['ls-files', '-ci', '-z', '--exclude-per-directory=.gitignore']));
  for (const file of ignoredTracked) {
    if (!worktree || lstatSync(path.join(root, file), { throwIfNoEntry: false })) {
      report(file, 'tracked path is ignored by repository policy');
    }
  }

  const paths = worktree
    ? [...tracked, ...splitPaths(git(['ls-files', '-z', '--others', '--exclude-standard']))]
    : tracked;
  for (const file of paths) {
    if (privatePath(file) && (!worktree || lstatSync(path.join(root, file), { throwIfNoEntry: false }))) {
      report(file, 'private file type');
    }
  }

  const sensitive = ['PRIVATE KEY-----', 'AIza', 'gh[pousr]_', 'github_pat_', '(AKIA|ASIA)[A-Z0-9]{16}', 'xox[baprs]-', 'postgres(ql)?://', credentialVariable];
  const candidates = worktree
    ? paths
    : [
      ...splitPaths(git(['grep', '--cached', '-I', '-i', '-l', '-z', '-E', '-e', sensitive.join('|'), '--'], [1])),
      ...tracked.filter((file) => /(?:^|\/)\.env\.example$/i.test(file)),
    ];

  for (const file of new Set(candidates)) {
    if (problems.has(file)) continue;
    const absolute = path.join(root, file);
    if (worktree && !lstatSync(absolute, { throwIfNoEntry: false })?.isFile()) continue;
    const source = worktree ? readFileSync(absolute, 'utf8') : git(['show', `:${file}`]);
    if (!source.includes('\0')) scan(file, source);
  }

  if (baseIndex >= 0 && !base) throw new Error('--base requires a Git revision');
  const revision = base && !/^0+$/.test(base)
    ? git(['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]).trim()
    : undefined;
  const comparison = worktree ? [] : ['--cached'];
  if (revision || (!base && git(['rev-parse', '--verify', 'HEAD'], [128]).trim())) {
    const migrationChanges = splitPaths(git([
      'diff', ...comparison, '--no-renames', '--diff-filter=DMRT', '--name-only', '-z',
      revision || 'HEAD', '--', 'backend/src/migrations/*.sql',
    ]));
    for (const file of migrationChanges) report(file, 'existing SQL migration changed, use a new migration');
  }
} catch (error) {
  console.error(`Git hygiene check failed: ${error.message}`);
  process.exit(1);
}

if (problems.size) {
  for (const [file, reasons] of problems) console.error(`${file}: ${[...reasons].join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Git hygiene passed for ${worktree ? 'worktree' : 'index'}.`);
}
