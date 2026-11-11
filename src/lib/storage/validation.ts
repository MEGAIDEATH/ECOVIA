/**
 * Server-side upload validation shared by /api/files.
 *
 * The browser-supplied MIME type is never trusted: the real type is detected
 * from the file's leading bytes and must be allowed for the document kind.
 * The stored extension and Content-Type come from the detected type.
 */

/**
 * Vercel Functions reject request bodies above 4.5 MB, so uploads are capped
 * at 4 MB everywhere (the multipart envelope needs some headroom).
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '4 ميجابايت';

export const DOCUMENT_KINDS = [
  'profile_image',
  'resume',
  'license',
  'commercial_registration',
] as const;

export type UploadKind = (typeof DOCUMENT_KINDS)[number];

export type DetectedType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' | 'application/pdf';

const IMAGE_TYPES: readonly DetectedType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const ALLOWED_BY_KIND: Record<UploadKind, readonly DetectedType[]> = {
  profile_image: IMAGE_TYPES,
  resume: ['application/pdf'],
  license: ['application/pdf', ...IMAGE_TYPES],
  commercial_registration: ['application/pdf', ...IMAGE_TYPES],
};

export const EXTENSION_BY_TYPE: Record<DetectedType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === 'string' && (DOCUMENT_KINDS as readonly string[]).includes(value);
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

/** Detects the file type from its magic bytes, or null when unsupported. */
export function detectFileType(bytes: Uint8Array): DetectedType | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return 'application/pdf'; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image/gif'; // GIF8
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp'; // RIFF....WEBP
  }
  return null;
}

export type UploadCheck =
  | { ok: true; type: DetectedType; extension: string }
  | { ok: false; message: string };

export function validateUpload(kind: UploadKind, bytes: Uint8Array): UploadCheck {
  if (bytes.length === 0) return { ok: false, message: 'الملف فارغ.' };
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return { ok: false, message: `حجم الملف يتجاوز الحد المسموح به (${MAX_UPLOAD_LABEL}).` };
  }
  const type = detectFileType(bytes);
  if (!type || !ALLOWED_BY_KIND[kind].includes(type)) {
    return { ok: false, message: 'صيغة الملف غير مدعومة لهذا النوع من المستندات.' };
  }
  return { ok: true, type, extension: EXTENSION_BY_TYPE[type] };
}
