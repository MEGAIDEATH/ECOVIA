/**
 * External-link safety for user-controlled URLs (portfolio links, resume URLs).
 *
 * These values are written by other users (a specialist's CV is viewed by
 * organizations) and legacy records were never validated, so the URL is only
 * rendered as a link when it uses http(s) — anything else (`javascript:`,
 * `data:`, `vbscript:`, relative garbage, …) is rendered as plain text instead.
 */
const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

export function isSafeExternalUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return SAFE_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

/** Returns the URL when it is safe to link to, otherwise null. */
export function safeExternalUrl(value: string | null | undefined): string | null {
  return isSafeExternalUrl(value) ? (value as string) : null;
}

/** Safe image sources: ordinary http(s) URLs plus legacy raster image data URLs. */
export function safeImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isSafeExternalUrl(value)) return value as string;
  return /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value) ? value : null;
}

/**
 * Safe internal redirect target for post-login navigation.
 *
 * Only same-origin relative paths are allowed. Absolute URLs, protocol-relative
 * URLs, backslashes (which some browsers normalize to `/`), and anything that
 * does not start with a single `/` are rejected to prevent open redirects.
 */
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed.includes('\\')) return null;
  // Reject control characters and CR/LF injection.
  if (/[\\r\\n]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, 'http://ecovia.local');
    if (url.origin !== 'http://ecovia.local') return null;
    return trimmed;
  } catch {
    return null;
  }
}

/** Safe download sources: http(s) or a legacy PDF data URL, never scriptable data. */
export function safeDownloadUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isSafeExternalUrl(value)) return value as string;
  return /^data:application\/pdf;base64,[a-z0-9+/=]+$/i.test(value) ? value : null;
}
