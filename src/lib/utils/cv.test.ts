import { describe, expect, it } from 'vitest';

import { formatExperienceYears, maskNationalIdForOrganization } from './cv';

describe('maskNationalIdForOrganization', () => {
  it('masks ids of length >= 10 as first3 + **** + rest-from-index-7 (legacy)', () => {
    expect(maskNationalIdForOrganization('1098765432')).toBe('109****432');
  });

  it('leaves shorter values untouched (legacy guard)', () => {
    expect(maskNationalIdForOrganization('123')).toBe('123');
  });
});

describe('formatExperienceYears', () => {
  it('formats years with the legacy suffix', () => {
    expect(formatExperienceYears('5')).toBe('5 سنوات خبرة');
    expect(formatExperienceYears(7)).toBe('7 سنوات خبرة');
  });

  it('shows the beginner label when empty (legacy)', () => {
    expect(formatExperienceYears(null)).toBe('مبتدئ');
    expect(formatExperienceYears(undefined)).toBe('مبتدئ');
    expect(formatExperienceYears('')).toBe('مبتدئ');
  });
});