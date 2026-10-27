import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach } from 'vitest';
import { createApp } from '../src/app';
import { openDatabase } from '../src/db/client';
import { serverRoot } from '../src/lib/paths';
import type { CoverSearch } from '../src/services/cover-search';
import { CoverStore } from '../src/services/covers';

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

export async function setup({ coverSearch }: { coverSearch?: CoverSearch } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'stacks-test-'));
  const database = openDatabase(':memory:', join(serverRoot(), 'drizzle'));
  const covers = new CoverStore(join(dir, 'covers'));
  await covers.init();
  const { app, itemService } = createApp({
    db: database.db,
    covers,
    coverSearch,
    config: {
      webDir: join(dir, 'no-web'),
      coverImport: { allowPrivate: false, maxBytes: 1e6, timeoutMs: 2000 },
    },
  });
  cleanups.push(() => {
    database.close();
    rmSync(dir, { recursive: true, force: true });
  });

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await app.request(path, {
      method,
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };
  return { app, covers, itemService, call, db: database.db };
}
