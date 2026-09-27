/**
 * Protected-file helpers.
 *
 * Documents live in server storage and are only reachable through the
 * authenticated `GET /api/files/{id}` route, so the database always stores the
 * document **id** while the browser works with the serving URL.
 */
const FILE_ROUTE_PREFIX = '/api/files/';

/** Protected file URL for a stored document id. */
export function fileUrl(id?: string | null): string | null {
  return id ? `${FILE_ROUTE_PREFIX}${id}` : null;
}

/**
 * Document id out of a protected file URL.
 * Returns null for blob:/external/legacy URLs, which have no document row.
 */
export function documentIdFromUrl(url: string | null | undefined): string | null {
  return url && url.startsWith(FILE_ROUTE_PREFIX) ? url.slice(FILE_ROUTE_PREFIX.length) : null;
}

/**
 * Organization-facing privacy masking for national IDs.
 * Legacy: `id.substring(0, 3) + '****' + id.substring(7)` for ids with length >= 10.
 */
export function maskNationalIdForOrganization(nationalId: string): string {
  if (nationalId.length >= 10) {
    return nationalId.substring(0, 3) + '****' + nationalId.substring(7);
  }
  return nationalId;
}

/** Legacy preview copy: `X سنوات خبرة` or `مبتدئ`. */
export function formatExperienceYears(years?: string | number | null): string {
  return years ? `${years} سنوات خبرة` : 'مبتدئ';
}
