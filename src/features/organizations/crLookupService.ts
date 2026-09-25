export interface CrLookupResult {
  orgName: string;
  orgDesc: string;
}

/**
 * Commercial-registration lookup abstraction. The current implementation is
 * the legacy demo mock (1.5s delay + fixed record) — replace with a real Saudi
 * CR API client without touching the registration form.
 */
export interface CrLookupService {
  lookup(crNumber: string): Promise<CrLookupResult>;
}

export const mockCrLookupService: CrLookupService = {
  lookup(_crNumber: string): Promise<CrLookupResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          orgName: 'شركة التقنية البيئية المحدودة',
          orgDesc: 'شركة متخصصة في الاستشارات البيئية.',
        });
      }, 1500);
    });
  },
};

/** Active CR lookup implementation (demo mock today). */
export function getCrLookupService(): CrLookupService {
  return mockCrLookupService;
}
