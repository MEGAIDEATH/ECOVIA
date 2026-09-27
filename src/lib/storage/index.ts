import 'server-only';

import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

/**
 * Provider-neutral document storage.
 *
 * `StorageProvider` is the seam: today it is implemented by the local
 * filesystem (development), and a company-controlled S3-compatible or object
 * storage backend can be added later without touching business logic.
 *
 * Protected uploads are NEVER written into `public/`: they live outside the
 * served directories and are only reachable through the authenticated
 * `/api/files/[id]` route.
 */
export interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number }>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

function storageRoot(): string {
  // Configurable for deployments; defaults to a git-ignored directory outside
  // the Next.js `public/` tree.
  const configured = process.env.STORAGE_LOCAL_DIR;
  return resolve(configured && configured.length > 0 ? configured : join(process.cwd(), '.data', 'uploads'));
}

/** Rejects traversal attempts before any filesystem access. */
function safePath(key: string): string {
  const root = storageRoot();
  const target = normalize(join(root, key));
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error('Invalid storage key.');
  }
  return target;
}

class LocalFileStorage implements StorageProvider {
  async put(key: string, data: Buffer): Promise<void> {
    const target = safePath(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
  }

  async get(key: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number }> {
    const target = safePath(key);
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file.');
    const nodeStream = createReadStream(target);
    return {
      // Node's fs stream → web ReadableStream (the global `ReadableStream.from`
      // static is not in the current TS lib definitions).
      stream: Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>,
      size: info.size,
    };
  }

  async delete(key: string): Promise<void> {
    await rm(safePath(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      const info = await stat(safePath(key));
      return info.isFile();
    } catch {
      return false;
    }
  }
}

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!provider) provider = new LocalFileStorage();
  return provider;
}

/** Builds a collision-free object key, namespaced per owner and purpose. */
export function buildStorageKey(ownerUserId: string, kind: string, extension: string): string {
  const safeKind = kind.replace(/[^a-z_]/gi, '');
  const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${ownerUserId}/${safeKind}/${randomUUID()}.${safeExt}`;
}
