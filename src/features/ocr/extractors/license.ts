/**
 * Environmental license (ELESL transaction) + issue-date extraction.
 * Ported 1:1 from the legacy `simulateAIScan(input, 'spec')` parser:
 * - normalizes `ELESL-YYYY-N` / `ELESLYYYYN` to `ELESL-YYYY-N`
 * - when several `DD/MM/YYYY` / `DD-MM-YYYY` dates exist, the LATEST wins
 *   and is returned as `YYYY-MM-DD` for <input type="date">.
 */

export interface LicenseExtraction {
  license: string | null;
  issueDate: string | null;
}

export function extractLicenseInfo(rawText: string): LicenseExtraction {
  const upper = rawText.toUpperCase();

  // Date-shaped tokens are removed before the text is compacted, otherwise the
  // digits of a directly-following date get captured as part of the license
  // number (e.g. "ELESL-2024-77777 01/02/2025" became ELESL-2024-7777701).
  // Patterns and normalization otherwise stay identical to the legacy parser.
  const datePattern = /\d{2}[/\-]\d{2}[/\-]\d{4}/g;
  const cleanText = upper.replace(datePattern, ' ').replace(/\s+/g, '');

  let license: string | null = null;
  let issueDate: string | null = null;

  const transMatch = cleanText.match(/(ELESL-\d{4}-\d+)/) || cleanText.match(/(ELESL\d{4}\d+)/);
  if (transMatch) {
    license = transMatch[1].replace(/(ELESL)(\d{4})(\d+)/, '$1-$2-$3');
  }

  const dateMatches = upper.match(datePattern);
  if (dateMatches) {
    let maxDateVal = 0;
    dateMatches.forEach((d) => {
      const parts = d.split(/[/\-]/);
      const time = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
      if (time > maxDateVal) {
        maxDateVal = time;
        issueDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    });
  }

  return { license, issueDate };
}
