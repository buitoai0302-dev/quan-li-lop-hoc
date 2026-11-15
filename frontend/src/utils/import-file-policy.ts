export const IMPORT_FILE_LIMITS = {
  MAX_FILE_BYTES: 5 * 1024 * 1024,
  MAX_ROWS: 500,
  MAX_COLUMNS: 64,
  MAX_SHEETS: 10,
  TIMEOUT_MS: 10_000,
} as const;

export const IMPORT_FILE_ERROR_PARAMS = {
  maxSizeMb: IMPORT_FILE_LIMITS.MAX_FILE_BYTES / (1024 * 1024),
  maxRows: IMPORT_FILE_LIMITS.MAX_ROWS,
  maxColumns: IMPORT_FILE_LIMITS.MAX_COLUMNS,
  maxSheets: IMPORT_FILE_LIMITS.MAX_SHEETS,
} as const;

export const IMPORT_FILE_ERROR_KEYS = {
  INVALID_FORMAT: 'import.errors.invalidFormat',
  TOO_LARGE: 'import.errors.fileTooLarge',
  TOO_MANY_ROWS: 'import.errors.tooManyRows',
  TOO_MANY_COLUMNS: 'import.errors.tooManyColumns',
  TOO_MANY_SHEETS: 'import.errors.tooManySheets',
  TIMEOUT: 'import.errors.parseTimeout',
  READ_FAILED: 'import.errors.read_file_error',
} as const;

export type ImportFileErrorKey =
  (typeof IMPORT_FILE_ERROR_KEYS)[keyof typeof IMPORT_FILE_ERROR_KEYS];
export interface ParsedImportFile {
  data: Record<string, unknown>[];
  headers: string[];
}
export type ImportWorkerResponse = { result: ParsedImportFile } | { errorKey: ImportFileErrorKey };

export class ImportFileError extends Error {
  constructor(public readonly key: ImportFileErrorKey) {
    super(key);
  }
}

export function validateImportFile(file: Pick<File, 'name' | 'size'>) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !['xlsx', 'xls', 'csv', 'tsv'].includes(extension)) {
    throw new ImportFileError(IMPORT_FILE_ERROR_KEYS.INVALID_FORMAT);
  }
  if (file.size > IMPORT_FILE_LIMITS.MAX_FILE_BYTES) {
    throw new ImportFileError(IMPORT_FILE_ERROR_KEYS.TOO_LARGE);
  }
  return extension;
}

export function importFileErrorKey(error: unknown): ImportFileErrorKey {
  return error instanceof ImportFileError ? error.key : IMPORT_FILE_ERROR_KEYS.READ_FAILED;
}
