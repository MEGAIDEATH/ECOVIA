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
