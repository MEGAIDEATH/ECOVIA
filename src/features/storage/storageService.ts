/**
 * Client document upload service.
 * Uploads files to the server's protected document storage via /api/files.
 */

const PROFILE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const PROFILE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const SCANNABLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}

export class UploadError extends Error {
  constructor(message = 'تعذر رفع الملف، حاول مرة أخرى.') {
    super(message);
    this.name = 'UploadError';
  }
}

export interface UploadProgress {
  (percent: number): void;
}

export interface UploadHandle {
  /** Resolves to the file's ID / serving URL once uploaded. */
  promise: Promise<string>;
  cancel(): void;
}

function assertImage(file: File): void {
  if (!PROFILE_IMAGE_TYPES.has(file.type)) {
    throw new UploadValidationError('صيغة الملف غير مدعومة، اختر صورة JPG أو PNG.');
  }
  if (file.size > PROFILE_MAX_BYTES) {
    throw new UploadValidationError('حجم الصورة يتجاوز 5 ميجابايت.');
  }
}

function assertPdf(file: File): void {
  if (file.type !== 'application/pdf') {
    throw new UploadValidationError('الملف يجب أن يكون بصيغة PDF.');
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    throw new UploadValidationError('حجم الملف يتجاوز 10 ميجابايت.');
  }
}

function assertScannableDocument(file: File): void {
  const ok = file.type === 'application/pdf' || SCANNABLE_IMAGE_TYPES.has(file.type);
  if (!ok) {
    throw new UploadValidationError('صيغة الملف غير مدعومة، اختر صورة أو PDF.');
  }
  if (file.size > DOCUMENT_MAX_BYTES) {
    throw new UploadValidationError('حجم الملف يتجاوز 10 ميجابايت.');
  }
}

function uploadViaHttp(file: File, kind: string, onProgress?: UploadProgress): UploadHandle {
  const controller = new AbortController();

  const promise = new Promise<string>((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);

    if (onProgress) onProgress(20);

    fetch('/api/files', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
      .then(async (res) => {
        if (onProgress) onProgress(90);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new UploadError(body?.error || 'تعذر رفع الملف.');
        }
        return res.json() as Promise<{ id: string; url: string }>;
      })
      .then((data) => {
        if (onProgress) onProgress(100);
        resolve(data.url);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          reject(new UploadError('تم إلغاء الرفع.'));
        } else {
          reject(err instanceof Error ? err : new UploadError());
        }
      });
  });

  return {
    promise,
    cancel: () => controller.abort(),
  };
}

export function uploadProfileImage(file: File, onProgress?: UploadProgress): UploadHandle {
  assertImage(file);
  return uploadViaHttp(file, 'profile_image', onProgress);
}

export function uploadResume(file: File, onProgress?: UploadProgress): UploadHandle {
  assertPdf(file);
  return uploadViaHttp(file, 'resume', onProgress);
}

export function uploadDocumentForOCR(
  file: File,
  kind: 'license' | 'commercial',
  onProgress?: UploadProgress,
): UploadHandle {
  assertScannableDocument(file);
  const documentKind = kind === 'license' ? 'license' : 'commercial_registration';
  return uploadViaHttp(file, documentKind, onProgress);
}
