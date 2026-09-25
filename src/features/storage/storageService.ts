import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';

import { getFirebaseStorage } from '@/lib/firebase/client';

/**
 * Firebase Storage abstractions. Only paths/URLs are persisted to Firestore —
 * never Base64 payloads (the legacy approach).
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
  /** Resolves to the download URL once the upload completes. */
  promise: Promise<string>;
  /** Cancels an in-flight upload (best effort). */
  cancel(): void;
}

function extensionFor(file: File): string {
  const fromType = file.type.split('/')[1];
  if (fromType) return fromType === 'jpeg' ? 'jpg' : fromType;
  const dot = file.name.lastIndexOf('.');
  return dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : 'bin';
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

function startUpload(
  storagePath: string,
  file: File,
  onProgress?: UploadProgress,
): UploadHandle {
  const storageRef = ref(getFirebaseStorage(), storagePath);
  const task = uploadBytesResumable(storageRef, file);

  const promise = new Promise<string>((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (onProgress) {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(percent);
        }
      },
      (error) => {
        console.error('[storage] upload failed:', storagePath, error);
        if (error.code === 'storage/canceled') {
          reject(new UploadError('تم إلغاء الرفع.'));
        } else {
          reject(new UploadError());
        }
      },
      async () => {
        try {
          resolve(await getDownloadURL(task.snapshot.ref));
        } catch (error) {
          console.error('[storage] getDownloadURL failed:', error);
          reject(new UploadError());
        }
      },
    );
  });

  return { promise, cancel: () => void task.cancel() };
}

/** Uploads the specialist's profile picture → `specialists/{uid}/profile-*`. */
export function uploadProfileImage(
  uid: string,
  file: File,
  onProgress?: UploadProgress,
): UploadHandle {
  assertImage(file);
  return startUpload(`specialists/${uid}/profile-${Date.now()}.${extensionFor(file)}`, file, onProgress);
}

/** Uploads the specialist's resume PDF → `specialists/{uid}/resume-*`. */
export function uploadResume(
  uid: string,
  file: File,
  onProgress?: UploadProgress,
): UploadHandle {
  assertPdf(file);
  return startUpload(`specialists/${uid}/resume-${Date.now()}.pdf`, file, onProgress);
}

/** Archives the scanned registration document → `ocr-documents/{uid}/…`. */
export function uploadDocumentForOCR(
  uid: string,
  file: File,
  kind: 'license' | 'commercial',
  onProgress?: UploadProgress,
): UploadHandle {
  assertScannableDocument(file);
  const ext = extensionFor(file);
  return startUpload(
    `ocr-documents/${uid}/${kind}-${Date.now()}.${ext}`,
    file,
    onProgress,
  );
}
