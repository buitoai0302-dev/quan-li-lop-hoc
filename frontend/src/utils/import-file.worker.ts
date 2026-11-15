import { parseImportBuffer } from './import-file-parser';
import {
  importFileErrorKey,
  validateImportFile,
  type ImportWorkerResponse,
} from './import-file-policy';

self.onmessage = async (event: MessageEvent<File>) => {
  let response: ImportWorkerResponse;
  try {
    const extension = validateImportFile(event.data);
    const buffer = await event.data.arrayBuffer();
    response = { result: parseImportBuffer(buffer, extension) };
  } catch (error) {
    response = { errorKey: importFileErrorKey(error) };
  }
  self.postMessage(response);
};
