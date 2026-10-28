import type { CoverUploadResult } from '@stacks/shared';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { AppError } from '../lib/errors';

const NAME = /^[a-f0-9-]{36}\.webp$/;
const MAX_EDGE = 1000;

export class CoverStore {
  constructor(readonly dir: string) {}

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  path(name: string): string {
    if (!NAME.test(name)) throw new AppError(400, 'invalid_cover', 'Invalid cover reference.');
    return join(this.dir, name);
  }

  async exists(name: string): Promise<boolean> {
    if (!NAME.test(name)) return false;
    try {
      return (await stat(this.path(name))).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Re-encodes any supported image to a bounded WebP. Re-encoding strips metadata
   * (including GPS) and guarantees we only ever serve images we produced.
   */
  async save(input: Buffer): Promise<CoverUploadResult> {
    let output: { data: Buffer; info: sharp.OutputInfo };
    try {
      output = await sharp(input, { limitInputPixels: 80_000_000, failOn: 'error' })
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new AppError(
        422,
        'invalid_image',
        'That file isn’t an image we can read. Try a JPG, PNG or WebP.',
      );
    }
    const name = `${randomUUID()}.webp`;
    await this.writeAtomic(name, output.data);
    return { cover: name, width: output.info.width, height: output.info.height };
  }

  /** Stores an already-processed cover under its existing name (used by import). */
  async restore(name: string, data: Buffer): Promise<void> {
    if (await this.exists(name)) return;
    await sharp(data).metadata(); // throws on garbage
    await this.writeAtomic(name, data);
  }

  /** Most common color of a stored cover as `#rrggbb`, or null if it can't be read. */
  async dominantColor(name: string): Promise<string | null> {
    try {
      const { dominant } = await sharp(this.path(name)).stats();
      return `#${[dominant.r, dominant.g, dominant.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    } catch {
      return null;
    }
  }

  read(name: string): Promise<Buffer> {
    return readFile(this.path(name));
  }

  private async writeAtomic(name: string, data: Buffer): Promise<void> {
    const tmp = join(this.dir, `.${name}.${process.pid}.tmp`);
    await writeFile(tmp, data);
    await rename(tmp, this.path(name));
  }

  /** Removes files no item references, after a grace period so in-progress forms keep theirs. */
  async removeOrphans(referenced: Set<string>, graceMs: number): Promise<number> {
    let removed = 0;
    const cutoff = Date.now() - graceMs;
    for (const file of await readdir(this.dir)) {
      const full = join(this.dir, file);
      const isTemp = file.startsWith('.') && file.endsWith('.tmp');
      if (!isTemp && (!NAME.test(file) || referenced.has(file))) continue;
      const info = await stat(full).catch(() => null);
      if (info && info.mtimeMs < cutoff) {
        await rm(full, { force: true });
        removed++;
      }
    }
    return removed;
  }
}
