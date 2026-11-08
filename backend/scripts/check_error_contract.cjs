const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..', '..');
const source = (file) => ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

function catalog(file) {
  const codes = new Set();
  const visit = (node) => {
    const initializer = node.initializer && ts.isAsExpression(node.initializer)
      ? node.initializer.expression : node.initializer;
    if (ts.isVariableDeclaration(node) && node.name.getText() === 'ERROR_CODES' &&
        initializer && ts.isObjectLiteralExpression(initializer)) {
      for (const entry of initializer.properties) {
        if (ts.isPropertyAssignment(entry)) codes.add(entry.name.getText());
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source(file));
  return codes;
}

function stringObject(file, name) {
  const values = new Map();
  const visit = (node) => {
    const initializer = node.initializer && ts.isAsExpression(node.initializer)
      ? node.initializer.expression : node.initializer;
    if (ts.isVariableDeclaration(node) && node.name.getText() === name &&
        initializer && ts.isObjectLiteralExpression(initializer)) {
      for (const entry of initializer.properties) {
        if (ts.isPropertyAssignment(entry) && ts.isStringLiteral(entry.initializer)) {
          values.set(entry.name.getText(), entry.initializer.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source(file));
  return values;
}

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? files(full) : entry.name.endsWith('.ts') ? [full] : [];
  });
}

const backend = catalog(path.join(root, 'backend/src/utils/constants.ts'));
const frontend = catalog(path.join(root, 'frontend/src/utils/constants.ts'));
if (backend.size === 0 || frontend.size === 0) {
  throw new Error('ERROR_CODES catalog could not be read');
}
const locales = Object.fromEntries(['en', 'vi'].map(lang => [lang,
  JSON.parse(fs.readFileSync(path.join(root, `frontend/src/locales/${lang}.json`), 'utf8')).errors,
]));
const problems = [];
const backendRoles = stringObject(path.join(root, 'backend/src/utils/constants.ts'), 'ROLES');
const frontendRoles = stringObject(path.join(root, 'frontend/src/utils/constants.ts'), 'USER_ROLES');
if (backendRoles.size === 0 || frontendRoles.size === 0) {
  throw new Error('Role catalogs could not be read');
}
for (const [role, value] of backendRoles) {
  if (frontendRoles.get(role) !== value) problems.push(`frontend USER_ROLES differs for ${role}`);
}
for (const role of frontendRoles.keys()) {
  if (!backendRoles.has(role)) problems.push(`backend ROLES missing ${role}`);
}
const backendCodeValues = stringObject(path.join(root, 'backend/src/utils/constants.ts'), 'ERROR_CODES');
const frontendCodeValues = stringObject(path.join(root, 'frontend/src/utils/constants.ts'), 'ERROR_CODES');

for (const code of backend) {
  if (!/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(code)) {
    problems.push(`ERROR_CODES key must use UPPER_SNAKE_CASE: ${code}`);
  }
  if (!frontend.has(code)) problems.push(`frontend ERROR_CODES missing ${code}`);
  if (backendCodeValues.get(code) !== code || frontendCodeValues.get(code) !== code) {
    problems.push(`ERROR_CODES value differs for ${code}`);
  }
  for (const [lang, errors] of Object.entries(locales)) {
    if (!errors[code]) problems.push(`${lang} translation missing ${code}`);
  }
}
for (const code of frontend) {
  if (!backend.has(code)) problems.push(`backend ERROR_CODES missing ${code}`);
}

for (const file of files(path.join(root, 'backend/src'))) {
  const visit = (node) => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
        /^(Validation|Authentication|Forbidden|NotFound|LimitExceeded)Error$/.test(node.expression.text) &&
        node.arguments?.[1] && ts.isStringLiteral(node.arguments[1])) {
      const code = node.arguments[1].text;
      if (/^[A-Z][A-Z0-9_]+$/.test(code) && !backend.has(code)) {
        problems.push(`${path.relative(root, file)} uses uncatalogued ${code}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source(file));
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Contract valid: ${backend.size} error codes, ${backendRoles.size} roles, en and vi translations`);
}
