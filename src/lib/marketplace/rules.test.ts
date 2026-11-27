import { describe, expect, it } from 'vitest';

import type { OfferStatus } from '@/types';

import { offerBlockReason, specialistCanView, type RequestFacts, type SpecialistFacts } from './rules';

const me: SpecialistFacts = { id: 'spec-me', userId: 'user-me', approved: true };
const other: SpecialistFacts = { id: 'spec-other', userId: 'user-other', approved: true };

function request(overrides: Partial<RequestFacts> = {}): RequestFacts {
  return {
    organizationId: 'org-1',
    organizationUserId: 'user-org',
    visibility: 'public',
    targetSpecialistId: null,
    status: 'pending',
    specialistId: null,
    ...overrides,
  };
}

describe('request visibility', () => {
  it('shows open public requests to every approved specialist', () => {
    expect(specialistCanView(request(), me, false)).toBe(true);
    expect(specialistCanView(request(), other, false)).toBe(true);
  });
  it('never shows anything to an unapproved specialist', () => {
    expect(specialistCanView(request(), { ...me, approved: false }, false)).toBe(false);
  });
  it('shows a private request only to its designated specialist', () => {
    const privateRequest = request({ visibility: 'private', targetSpecialistId: me.id });
    expect(specialistCanView(privateRequest, me, false)).toBe(true);
    expect(specialistCanView(privateRequest, other, false)).toBe(false);
    // Even an "offer" flag cannot widen a private request.
    expect(specialistCanView(privateRequest, other, true)).toBe(false);
  });
  it('keeps a contracted public request visible to its participants only', () => {
    const contracted = request({ status: 'accepted', specialistId: me.id });
    expect(specialistCanView(contracted, me, false)).toBe(true);
    expect(specialistCanView(contracted, other, true)).toBe(true);
    expect(specialistCanView(contracted, other, false)).toBe(false);
  });
});

describe('offer eligibility', () => {
  it('allows offers on open requests', () => {
    expect(offerBlockReason(request(), me, null)).toBeNull();
    expect(offerBlockReason(request(), me, 'submitted')).toBeNull(); // revision
    expect(offerBlockReason(request(), me, 'withdrawn')).toBeNull(); // re-submit
  });
  it('blocks offers from anyone but the target on private requests', () => {
    const privateRequest = request({ visibility: 'private', targetSpecialistId: me.id });
    expect(offerBlockReason(privateRequest, me, null)).toBeNull();
    expect(offerBlockReason(privateRequest, other, null)).toBe('not_visible');
  });
  it('blocks offers once a contract is signed or the request is closed', () => {
    for (const status of ['accepted', 'in_progress', 'completed', 'cancelled'] as const) {
      expect(offerBlockReason(request({ status }), me, 'submitted')).toBe('closed');
    }
  });
  it('keeps the request open for other specialists while one contract awaits signature', () => {
    // The request is still `pending` while a contract is being signed.
    expect(offerBlockReason(request(), other, null)).toBeNull();
    // …but the selected specialist cannot revise the offer under the pending contract.
    expect(offerBlockReason(request(), me, 'selected' satisfies OfferStatus)).toBe('contract_pending');
  });
  it('prevents a facility owner from offering on their own request', () => {
    expect(offerBlockReason(request({ organizationUserId: me.userId }), me, null)).toBe('own_request');
  });
});
