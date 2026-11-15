import { fork, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import { resolve } from 'node:path';
import { gzipSync, brotliCompressSync, deflateSync } from 'node:zlib';

describe('compressed request parser on a disposable process', () => {
  let server: ChildProcess;
  let port: number;
  beforeAll(async () => {
    server = fork(resolve(__dirname, '../fixtures/json-parser-server.cjs'), [], {
      execArgv: [],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    port = await new Promise<number>((resolve, reject) => {
      server.once('message', (message) => resolve((message as { port: number }).port));
      server.once('error', reject);
      server.once('exit', (code) => reject(new Error(`Parser fixture exited: ${code}`)));
    });
  }, 15_000);
  afterAll(async () => {
    if (server?.connected) server.disconnect();
    if (server && server.exitCode === null) {
      const stopped = new Promise<void>((resolve) => server.once('exit', () => resolve()));
      server.kill();
      await stopped;
    }
  });

  function send(payload?: Buffer, encoding?: string) {
    return new Promise<number>((resolve, reject) => {
      const req = http.request(
        {
          host: '127.0.0.1',
          port,
          path: payload ? '/parse' : '/health',
          method: payload ? 'POST' : 'GET',
          headers: payload
            ? {
                'content-type': 'application/json',
                'content-length': payload.length,
                ...(encoding ? { 'content-encoding': encoding } : {}),
              }
            : {},
        },
        (res) => {
          res.resume();
          res.once('end', () => resolve(res.statusCode!));
        }
      );
      req.on('error', reject);
      req.setTimeout(3000, () => req.destroy(new Error('Parser request timed out')));
      req.end(payload);
    });
  }

  it('accepts ordinary JSON', async () => {
    expect(await send(Buffer.from('{"ok":true}'))).toBe(200);
  });
  it.each([
    ['gzip', gzipSync],
    ['br', brotliCompressSync],
    ['deflate', deflateSync],
  ] as const)('remains alive after malformed trailing bytes for %s', async (encoding, compress) => {
    const valid = compress(Buffer.from('{"ok":true}'));
    expect(await send(valid, encoding)).toBe(200);
    await send(Buffer.concat([valid, Buffer.from('invalid-trailing-bytes')]), encoding).catch(
      () => undefined
    );
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(server.exitCode).toBeNull();
    expect(await send()).toBe(200);
  });
  it('keeps the expanded body size limit', async () => {
    const payload = gzipSync(Buffer.from(JSON.stringify({ text: 'x'.repeat(2 * 1024 * 1024) })));
    expect(await send(payload, 'gzip')).toBe(413);
    expect(await send()).toBe(200);
  });
});
