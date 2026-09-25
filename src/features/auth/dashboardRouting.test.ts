import { describe, expect, it } from 'vitest';

import { resolveDestination } from './dashboardRouting';

const specApproved = { role: 'spec' as const, status: 'approved' as const };
const specPending = { role: 'spec' as const, status: 'pending' as const };
const orgApproved = { role: 'org' as const, status: 'approved' as const };
const orgPending = { role: 'org' as const, status: 'pending' as const };

describe('resolveDestination (legacy checkAndGoToDashboard order)', () => {
  it('prefers the preferred organization role when the doc exists', () => {
    expect(resolveDestination('org', specApproved, orgPending)).toEqual({
      type: 'waiting',
      role: 'org',
    });
    expect(resolveDestination('org', specApproved, orgApproved)).toEqual({
      type: 'dashboard',
      role: 'org',
    });
  });

  it('prefers the preferred specialist role when the doc exists', () => {
    expect(resolveDestination('spec', specApproved, orgApproved)).toEqual({
      type: 'dashboard',
      role: 'spec',
    });
  });

  it('falls back to the specialist doc when preference is missing/mismatched', () => {
    expect(resolveDestination(null, specPending, orgApproved)).toEqual({
      type: 'waiting',
      role: 'spec',
    });
    expect(resolveDestination('org', specPending, null)).toEqual({
      type: 'waiting',
      role: 'spec',
    });
  });

  it('falls back to the organization doc when no specialist doc exists', () => {
    expect(resolveDestination(null, null, orgPending)).toEqual({
      type: 'waiting',
      role: 'org',
    });
  });

  it('returns none when no account exists (legacy error toast path)', () => {
    expect(resolveDestination('spec', null, null)).toEqual({ type: 'none' });
    expect(resolveDestination(null, null, null)).toEqual({ type: 'none' });
  });

  it('routes pending accounts to the waiting room', () => {
    expect(resolveDestination('spec', specPending, null)).toEqual({
      type: 'waiting',
      role: 'spec',
    });
  });
});