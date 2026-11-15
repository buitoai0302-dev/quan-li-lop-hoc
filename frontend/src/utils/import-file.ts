import {
  IMPORT_FILE_LIMITS,
  IMPORT_FILE_ERROR_KEYS,
  ImportFileError,
  validateImportFile,
  type ParsedImportFile,
  type ImportWorkerResponse,
} from './import-file-policy';

export { importFileErrorKey, validateImportFile } from './import-file-policy';

export async function readImportFile(file: File, signal?: AbortSignal): Promise<ParsedImportFile> {
  validateImportFile(file);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return new Promise((resolve, reject) => {
    // Parsing untrusted spreadsheets must not block the UI thread. Terminate the
    // worker on timeout, file replacement, panel close, and route unmount.
    const worker = new Worker(new URL('./import-file.worker.ts', import.meta.url), {
      type: 'module',
    });
    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', abort);
      worker.terminate();
    };
    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };
    const abort = () => fail(new DOMException('Aborted', 'AbortError'));
    const timeoutId = setTimeout(
      () => fail(new ImportFileError(IMPORT_FILE_ERROR_KEYS.TIMEOUT)),
      IMPORT_FILE_LIMITS.TIMEOUT_MS
    );
    signal?.addEventListener('abort', abort, { once: true });
    worker.onmessage = (event: MessageEvent<ImportWorkerResponse>) => {
      if ('errorKey' in event.data) fail(new ImportFileError(event.data.errorKey));
      else {
        cleanup();
        resolve(event.data.result);
      }
    };
    worker.onerror = () => fail(new ImportFileError(IMPORT_FILE_ERROR_KEYS.READ_FAILED));
    worker.onmessageerror = () => fail(new ImportFileError(IMPORT_FILE_ERROR_KEYS.READ_FAILED));
    try {
      worker.postMessage(file);
    } catch {
      fail(new ImportFileError(IMPORT_FILE_ERROR_KEYS.READ_FAILED));
    }
  });
}
