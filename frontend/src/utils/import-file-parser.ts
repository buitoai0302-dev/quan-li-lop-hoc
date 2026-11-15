import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import {
  IMPORT_FILE_LIMITS,
  IMPORT_FILE_ERROR_KEYS,
  ImportFileError,
  type ParsedImportFile,
} from './import-file-policy';

// Called only inside the disposable worker. Bound rows before converting cells
// into JS objects; refuse oversized workbooks rather than silently truncating data.
export function parseImportBuffer(buffer: ArrayBuffer, extension: string): ParsedImportFile {
  let data: Record<string, unknown>[];
  let headers: string[];
  if (extension === 'csv' || extension === 'tsv') {
    const parsed = Papa.parse<Record<string, unknown>>(new TextDecoder().decode(buffer), {
      header: true,
      skipEmptyLines: true,
      preview: IMPORT_FILE_LIMITS.MAX_ROWS + 1,
      ...(extension === 'tsv' ? { delimiter: '\t' } : {}),
    });
    // A valid one-column CSV has no delimiter to infer; Papa falls back to comma.
    if (parsed.errors.some((error) => error.code !== 'UndetectableDelimiter')) {
      throw new ImportFileError(IMPORT_FILE_ERROR_KEYS.READ_FAILED);
    }
    data = parsed.data;
    headers = parsed.meta.fields ?? [];
  } else {
    const workbook = XLSX.read(buffer, {
      type: 'array',
      sheets: 0,
      sheetRows: IMPORT_FILE_LIMITS.MAX_ROWS + 2,
      bookVBA: false,
      cellHTML: false,
      dateNF: 'yyyy-mm-dd',
    });
    if (workbook.SheetNames.length > IMPORT_FILE_LIMITS.MAX_SHEETS) {
      throw new ImportFileError(IMPORT_FILE_ERROR_KEYS.TOO_MANY_SHEETS);
    }
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const reference = sheet?.['!fullref'] || sheet?.['!ref'];
    if (reference) {
      const range = XLSX.utils.decode_range(reference);
      if (range.e.r - range.s.r > IMPORT_FILE_LIMITS.MAX_ROWS) {
        throw new ImportFileError(IMPORT_FILE_ERROR_KEYS.TOO_MANY_ROWS);
      }
      if (range.e.c - range.s.c + 1 > IMPORT_FILE_LIMITS.MAX_COLUMNS) {
        throw new ImportFileError(IMPORT_FILE_ERROR_KEYS.TOO_MANY_COLUMNS);
      }
    }
    data = sheet
      ? XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })
      : [];
    headers = data[0] ? Object.keys(data[0]) : [];
  }
  if (data.length > IMPORT_FILE_LIMITS.MAX_ROWS) {
    throw new ImportFileError(IMPORT_FILE_ERROR_KEYS.TOO_MANY_ROWS);
  }
  if (headers.length > IMPORT_FILE_LIMITS.MAX_COLUMNS) {
    throw new ImportFileError(IMPORT_FILE_ERROR_KEYS.TOO_MANY_COLUMNS);
  }
  return { data, headers };
}
