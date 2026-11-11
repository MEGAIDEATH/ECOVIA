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

/** Specialist profile → the shape the CV views render (document ids → protected URLs). */
export function toCvPreviewData(profile: {
  fullName?: string | null;
  nationalId?: string | null;
  email?: string | null;
  phone?: string | null;
  edu?: string | null;
  city?: string | null;
  years?: string | number | null;
  license?: string | null;
  exp?: string | null;
  portfolio?: string | null;
  profilePicId?: string | null;
  resumeFileId?: string | null;
}) {
  return {
    fullName: profile.fullName,
    nationalId: profile.nationalId,
    email: profile.email,
    phone: profile.phone,
    edu: profile.edu,
    city: profile.city,
    years: profile.years,
    license: profile.license,
    exp: profile.exp,
    portfolio: profile.portfolio,
    profilePic: fileUrl(profile.profilePicId),
    resumeFile: fileUrl(profile.resumeFileId),
  };
}
