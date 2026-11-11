import 'server-only';

import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

/**
 * Provider-neutral document storage.
 *
 * `StorageProvider` is the seam:
 * - Neon Object Storage (S3-compatible, private bucket) whenever an S3
 *   endpoint is configured. Required on deployments: Vercel functions have no
 *   persistent filesystem. Each Neon branch has its own bucket endpoint, so the
 *   demo branch's files never mix with production's.
 * - The local filesystem for local development only.
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

interface S3Settings {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/**
 * Vercel reserves the `AWS_*` variable names, so deployments use the
 * `STORAGE_S3_*` names; locally the AWS-standard names written by
 * `neon env pull` work too.
 */
function s3Settings(env: Record<string, string | undefined> = process.env): S3Settings | null {
  const endpoint = env.STORAGE_S3_ENDPOINT || env.AWS_ENDPOINT_URL_S3;
  const accessKeyId = env.STORAGE_S3_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = env.STORAGE_S3_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return {
    endpoint,
    accessKeyId,
    secretAccessKey,
    region: env.STORAGE_S3_REGION || env.AWS_REGION || 'ap-southeast-1',
    bucket: env.STORAGE_BUCKET || 'documents',
  };
}

export class StorageConfigError extends Error {
  constructor() {
    super('Object storage is not configured (STORAGE_S3_* variables are missing).');
    this.name = 'StorageConfigError';
  }
}

class S3ObjectStorage implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(settings: S3Settings) {
    this.bucket = settings.bucket;
    this.client = new S3Client({
      endpoint: settings.endpoint,
      region: settings.region,
      credentials: {
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey,
      },
      // Neon Object Storage requires path-style addressing.
      forcePathStyle: true,
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        ContentLength: data.length,
      }),
    );
  }

  async get(key: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number }> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new Error('Empty object body.');
    return {
      stream: result.Body.transformToWebStream() as ReadableStream<Uint8Array>,
      size: Number(result.ContentLength ?? 0),
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch (error) {
      const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status === 404) return false;
      throw error;
    }
  }
}

let provider: StorageProvider | null = null;

/** Running on a hosting platform (no persistent local filesystem). */
function isDeployed(): boolean {
  return Boolean(process.env.VERCEL || process.env.NETLIFY);
}

export function getStorage(): StorageProvider {
  if (provider) return provider;
  const settings = s3Settings();
  if (settings) {
    provider = new S3ObjectStorage(settings);
  } else if (isDeployed()) {
    // Never fall back to the ephemeral filesystem on a deployment: files
    // would silently disappear.
    throw new StorageConfigError();
  } else {
    provider = new LocalFileStorage();
  }
  return provider;
}

/** Name of the active backend, for diagnostics (never includes secrets). */
export function storageBackendName(): 's3' | 'local' | 'unconfigured' {
  if (s3Settings()) return 's3';
  return isDeployed() ? 'unconfigured' : 'local';
}

/** Builds a collision-free object key, namespaced per owner and purpose. */
export function buildStorageKey(ownerUserId: string, kind: string, extension: string): string {
  const safeKind = kind.replace(/[^a-z_]/gi, '');
  const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'bin';
  return `${ownerUserId}/${safeKind}/${randomUUID()}.${safeExt}`;
}
