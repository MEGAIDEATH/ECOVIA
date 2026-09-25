import { describe, expect, it, vi } from 'vitest';

import { mockCrLookupService } from './crLookupService';

describe('mockCrLookupService (legacy demo CR lookup)', () => {
  it('resolves the demo record after the legacy 1.5s delay', async () => {
    vi.useFakeTimers();
    const promise = mockCrLookupService.lookup('1010123456');
    vi.advanceTimersByTime(1500);
    const result = await promise;
    expect(result.orgName).toBe('شركة التقنية البيئية المحدودة');
    expect(result.orgDesc).toBe('شركة متخصصة في الاستشارات البيئية.');
    vi.useRealTimers();
  });
});