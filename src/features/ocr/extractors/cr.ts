/**
 * Commercial registration (CR) extraction — first 10-digit run found,
 * ported 1:1 from the legacy `simulateAIScan(input, 'org')` parser.
 */
export function extractCrNumber(rawText: string): string | null {
  const cleanText = rawText.toUpperCase().replace(/\s+/g, '');
  const crMatch = cleanText.match(/(\d{10})/);
  return crMatch ? crMatch[1] : null;
}
