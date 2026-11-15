const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const XLSX = require('xlsx');

// Compile the actual pure parser with the project's TypeScript dependency. No DOM,
// HTTP API, uploaded customer file or new test framework is needed for these cases.
const cacheRoot = path.resolve(__dirname, '../node_modules/.cache');
fs.mkdirSync(cacheRoot, { recursive: true });
const compiledDir = fs.mkdtempSync(path.join(cacheRoot, 'import-security-'));
fs.writeFileSync(path.join(compiledDir, 'package.json'), '{"type":"commonjs"}');
for (const name of ['import-file-policy', 'import-file-parser']) {
  const input = fs.readFileSync(path.resolve(__dirname, `../src/utils/${name}.ts`), 'utf8');
  fs.writeFileSync(
    path.join(compiledDir, `${name}.js`),
    ts.transpileModule(input, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    }).outputText
  );
}
const { parseImportBuffer } = require(path.join(compiledDir, 'import-file-parser.js'));
const { validateImportFile, IMPORT_FILE_LIMITS: limits } = require(
  path.join(compiledDir, 'import-file-policy.js')
);
after(() => {
  const target = path.resolve(compiledDir);
  assert.ok(target.startsWith(cacheRoot + path.sep));
  fs.rmSync(target, { recursive: true, force: true });
});

function workbook(rows, bookType = 'xlsx', sheets = 1) {
  const book = XLSX.utils.book_new();
  for (let i = 0; i < sheets; i++)
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), `Sheet${i + 1}`);
  return XLSX.write(book, { type: 'array', bookType });
}
const encode = (text) => new TextEncoder().encode(text).buffer;
const fixtureRows = [
  ['Họ Tên', 'Email'],
  ['Học viên thử', 'fixture@example.test'],
];

test('locks the patched SheetJS version used by import and export', () =>
  assert.equal(XLSX.version, '0.20.3'));
for (const extension of ['xlsx', 'xls']) {
  test(`reads Vietnamese ${extension} export/import without losing fields`, () => {
    assert.deepEqual(parseImportBuffer(workbook(fixtureRows, extension), extension), {
      headers: fixtureRows[0],
      data: [{ 'Họ Tên': 'Học viên thử', Email: 'fixture@example.test' }],
    });
  });
}
for (const [extension, delimiter] of [
  ['csv', ','],
  ['tsv', '\t'],
]) {
  test(`reads ${extension} with Unicode and escaped fields`, () => {
    const parsed = parseImportBuffer(
      encode(`Name${delimiter}Email\n"A, B"${delimiter}test@example.test`),
      extension
    );
    assert.deepEqual(parsed.data, [{ Name: 'A, B', Email: 'test@example.test' }]);
  });
  test(`rejects ${extension} beyond the row limit instead of returning truncated data`, () => {
    const text = ['Name', ...Array(limits.MAX_ROWS + 1).fill('Fixture')].join('\n');
    assert.throws(() => parseImportBuffer(encode(text), extension), {
      key: 'import.errors.tooManyRows',
    });
  });
}
test('rejects oversized files before any parsing and accepts uppercase extensions', () => {
  assert.throws(() => validateImportFile({ name: 'data.xlsx', size: limits.MAX_FILE_BYTES + 1 }), {
    key: 'import.errors.fileTooLarge',
  });
  assert.throws(() => validateImportFile({ name: 'data.html', size: 30 }), {
    key: 'import.errors.invalidFormat',
  });
  assert.equal(validateImportFile({ name: 'DATA.XLSX', size: limits.MAX_FILE_BYTES }), 'xlsx');
});
test('accepts exactly the row limit', () => {
  const rows = [['Name'], ...Array(limits.MAX_ROWS).fill(['Fixture'])];
  assert.equal(parseImportBuffer(workbook(rows), 'xlsx').data.length, limits.MAX_ROWS);
});
test('rejects a workbook exceeding the row limit', () => {
  const rows = [['Name'], ...Array(limits.MAX_ROWS + 1).fill(['Fixture'])];
  assert.throws(() => parseImportBuffer(workbook(rows), 'xlsx'), {
    key: 'import.errors.tooManyRows',
  });
});
test('rejects wide sheets and excessive sheet counts', () => {
  const columns = Array.from({ length: limits.MAX_COLUMNS + 1 }, (_, i) => `Field${i}`);
  assert.throws(() => parseImportBuffer(workbook([columns, columns]), 'xlsx'), {
    key: 'import.errors.tooManyColumns',
  });
  assert.throws(
    () => parseImportBuffer(workbook(fixtureRows, 'xlsx', limits.MAX_SHEETS + 1), 'xlsx'),
    { key: 'import.errors.tooManySheets' }
  );
});
test('rejects malformed CSV and malformed ZIP input', () => {
  assert.throws(() => parseImportBuffer(encode('Name,Email\n"unclosed'), 'csv'));
  assert.throws(() => parseImportBuffer(new Uint8Array([80, 75, 3, 4, 0]).buffer, 'xlsx'));
});
test('column names from untrusted files do not pollute Object.prototype', () => {
  parseImportBuffer(
    workbook([
      ['__proto__', 'constructor'],
      ['value', 'value'],
    ]),
    'xlsx'
  );
  assert.equal(Object.prototype.value, undefined);
  assert.equal({}.constructor, Object);
});

test('preserves formatted phone numbers and Excel calendar dates', () => {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([['Phone', 'DOB'], [123456789, new Date(2008, 11, 31)]]);
  sheet.A2.z = '0000000000';
  XLSX.utils.book_append_sheet(book, sheet, 'Sheet1');
  const parsed = parseImportBuffer(XLSX.write(book, { type: 'array', bookType: 'xlsx' }), 'xlsx');
  assert.deepEqual(parsed.data, [{ Phone: '0123456789', DOB: '2008-12-31' }]);
});
