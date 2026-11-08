const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const backend = path.join(root, 'backend/src');
const frontend = path.join(root, 'frontend/src');
const problems = [];

function* files(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else if (/\.tsx?$/.test(entry.name)) yield file;
  }
}

const inside = (file, directory) => file === directory || file.startsWith(directory + path.sep);
const isCallTo = (node, name) => ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) && node.expression.text === name;

for (const file of [...files(backend), ...files(frontend)]) {
  const inBackend = inside(file, backend);
  const backendLayer = inBackend ? path.relative(backend, file).split(path.sep)[0] : '';
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const report = (node, message) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    problems.push(`${path.relative(root, file)}:${line} ${message}`);
  };

  function checkImport(node, specifier) {
    if (!specifier || !ts.isStringLiteralLike(specifier)) return;
    const request = specifier.text;
    if (!request.startsWith('.')) return;
    const target = path.resolve(path.dirname(file), request);
    if (inside(target, path.join(root, inBackend ? 'frontend' : 'backend'))) {
      report(node, 'Use the HTTP contract between frontend and backend.');
    }
    if (backendLayer === 'routes' &&
        (inside(target, path.join(backend, 'services')) || /^db(?:\.[cm]?[jt]s)?$/.test(path.relative(backend, target)))) {
      report(node, 'Route modules must delegate business logic and SQL to controllers and services.');
    }
    if (backendLayer === 'services' && ['controllers', 'routes'].some(
      (layer) => inside(target, path.join(backend, layer))
    )) {
      report(node, 'Service modules must be independent of routes and controllers.');
    }
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      checkImport(node, node.moduleSpecifier);
    } else if (ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword || isCallTo(node, 'require'))) {
      checkImport(node, node.arguments[0]);
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const { expression: receiver, name } = node.expression;
      if (['controllers', 'cron', 'middlewares', 'routes', 'services'].includes(backendLayer) &&
          ts.isIdentifier(receiver) && receiver.text === 'console') {
        report(node, 'Use the shared logger for backend runtime messages.');
      }
      const sql = node.arguments[0];
      if (inBackend && name.text === 'query' && sql && ts.isTemplateExpression(sql)) {
        for (const span of sql.templateSpans) {
          if (/\b(?:req|request)\s*(?:\?\.|\.)\s*(?:body|params|query|headers)\b/.test(span.expression.getText(source))) {
            report(span.expression, 'Bind request data with PostgreSQL parameters.');
          }
        }
      }
    }
    if (backendLayer === 'routes' && isCallTo(node, 'requireRole')) {
      const access = node.arguments[0];
      if (!access || !ts.isPropertyAccessExpression(access) || access.expression.getText(source) !== 'ACCESS') {
        report(node, 'Use a named ACCESS policy with requireRole.');
      } else if (access.name.text.endsWith('_API')) {
        const route = node.parent;
        if (!ts.isCallExpression(route) || !ts.isPropertyAccessExpression(route.expression) ||
            route.expression.name.text !== 'get') {
          report(node, 'API reader access is restricted to explicit GET routes.');
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Source rules passed for backend/src and frontend/src.');
}
