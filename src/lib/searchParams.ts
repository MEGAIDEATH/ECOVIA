/** Next.js page `searchParams` (async in Next 16). */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** First value of a search param (repeated params → the first one). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
