import crypto from 'crypto';
import fs from 'fs';

const [inputPath, outputPath] = process.argv.slice(2);
const keyHex = process.env.BACKUP_ENCRYPTION_KEY;
if (!inputPath || !outputPath || !keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
  throw new Error('Usage: BACKUP_ENCRYPTION_KEY=<64 hex chars> npm run backup:decrypt -- input.zip.enc output.zip');
}

const data = fs.readFileSync(inputPath);
if (data.length < 35 || data.subarray(0, 7).toString() !== 'EDUBAK1') {
  throw new Error('Invalid encrypted backup format');
}
const iv = data.subarray(7, 19);
const tag = data.subarray(data.length - 16);
const ciphertext = data.subarray(19, data.length - 16);
const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv);
decipher.setAuthTag(tag);
const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
fs.writeFileSync(outputPath, plaintext, { flag: 'wx', mode: 0o600 });
console.log(`Decrypted archive to ${outputPath}`);
