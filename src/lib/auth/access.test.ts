import { describe, expect, it } from 'vitest';

import type { AccountStatus } from '@/types';

import {
  apiAccessStatus,
  decideWorkspaceAccess,
  entryPathFor,
  homePathFor,
  isApprovedStatus,
  ownedRoles,
  resolveActiveRole,
  type AccountFacts,
} from './access';

function account(spec: AccountStatus | null, org: AccountStatus | null, isAdmin = false): AccountFacts {
  return {
    userId: 'u1',
    isAdmin,
    specialist: spec ? { id: 's1', status: spec } : null,
    organization: org ? { id: 'o1', status: org } : null,
  };
}

describe('canonical approval rule', () => {
  it('treats only status === "approved" as approved', () => {
    expect(isApprovedStatus('approved')).toBe(true);
    expect(isApprovedStatus('pending')).toBe(false);
    expect(isApprovedStatus('rejected')).toBe(false);
    expect(isApprovedStatus(undefined)).toBe(false);
  });
});

describe('post-signup / post-login destination', () => {
  it('sends pending and rejected specialists to their own CV, never /waiting', () => {
    expect(entryPathFor(account('pending', null), null)).toBe('/specialist/cv');
    expect(entryPathFor(account('rejected', null), null)).toBe('/specialist/cv');
  });
  it('sends pending facilities to their own facility profile', () => {
    expect(entryPathFor(account(null, 'pending'), null)).toBe('/organization/profile');
  });
  it('sends approved accounts to their workspace', () => {
    expect(entryPathFor(account('approved', null), null)).toBe('/specialist');
    expect(entryPathFor(account(null, 'approved'), null)).toBe('/organization');
  });
  it('sends accounts without a profile to the account-type choice (no loop) and admins to /admin', () => {
    expect(entryPathFor(account(null, null), null)).toBe('/choose-role');
    expect(entryPathFor(account(null, null, true), null)).toBe('/admin');
  });
  it('never routes anywhere through a waiting page', () => {
    for (const status of ['pending', 'approved', 'rejected'] as const) {
      expect(homePathFor('spec', status)).not.toContain('waiting');
      expect(homePathFor('org', status)).not.toContain('waiting');
    }
  });
});

describe('workspace page access', () => {
  it('redirects signed-out visitors to login with the page as next', () => {
    expect(decideWorkspaceAccess(null, 'spec', 'any', '/specialist/cv')).toEqual({
      kind: 'redirect',
      to: '/login?next=%2Fspecialist%2Fcv',
    });
  });
  it('lets a pending specialist into their CV page', () => {
    expect(decideWorkspaceAccess(account('pending', null), 'spec', 'any', '/specialist/cv').kind).toBe('allow');
  });
  it('redirects a pending specialist from approved-only pages back to their CV', () => {
    for (const path of ['/specialist', '/specialist/requests', '/specialist/messages', '/specialist/requests/x']) {
      expect(decideWorkspaceAccess(account('pending', null), 'spec', 'approved', path)).toEqual({
        kind: 'redirect',
        to: '/specialist/cv',
      });
    }
  });
  it('redirects a pending facility from approved-only pages back to its profile', () => {
    expect(decideWorkspaceAccess(account(null, 'pending'), 'org', 'approved', '/organization/requests/new')).toEqual({
      kind: 'redirect',
      to: '/organization/profile',
    });
  });
  it('keeps approved users fully in', () => {
    expect(decideWorkspaceAccess(account('approved', null), 'spec', 'approved', '/specialist/requests').kind).toBe('allow');
  });
  it('sends a user without that role to their own entry page instead of looping', () => {
    expect(decideWorkspaceAccess(account('approved', null), 'org', 'any', '/organization')).toEqual({
      kind: 'redirect',
      to: '/specialist',
    });
    expect(decideWorkspaceAccess(account(null, null), 'spec', 'any', '/specialist')).toEqual({
      kind: 'redirect',
      to: '/choose-role',
    });
  });
});

describe('API access codes', () => {
  it('distinguishes 401 (no session) from 403 (unapproved / wrong role)', () => {
    expect(apiAccessStatus(null, 'spec', 'approved')).toBe(401);
    expect(apiAccessStatus(account('pending', null), 'spec', 'approved')).toBe(403);
    expect(apiAccessStatus(account('rejected', null), 'spec', 'approved')).toBe(403);
    expect(apiAccessStatus(account(null, 'approved'), 'spec', 'approved')).toBe(403);
    expect(apiAccessStatus(account('approved', null), 'spec', 'approved')).toBeNull();
  });
  it('allows a pending user on own-profile endpoints (role required, approval not)', () => {
    expect(apiAccessStatus(account('pending', null), 'spec', 'any')).toBeNull();
    expect(apiAccessStatus(account(null, 'pending'), 'org', 'any')).toBeNull();
  });
});

describe('facility ⇄ specialist context', () => {
  it('only offers roles the account owns', () => {
    expect(ownedRoles(account('approved', null))).toEqual(['spec']);
    expect(ownedRoles(account('approved', 'pending'))).toEqual(['spec', 'org']);
  });
  it('ignores a preferred role the account does not own (cannot grant a role)', () => {
    expect(resolveActiveRole(account('approved', null), 'org')).toBe('spec');
    expect(resolveActiveRole(account(null, null), 'org')).toBeNull();
  });
  it('honours an owned preference and lands on that profile’s home', () => {
    const both = account('approved', 'pending');
    expect(resolveActiveRole(both, 'org')).toBe('org');
    expect(entryPathFor(both, 'org')).toBe('/organization/profile');
    expect(entryPathFor(both, 'spec')).toBe('/specialist');
  });
});
