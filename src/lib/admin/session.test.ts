import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  verifyAdminPassword,
  verifyAdminSessionToken,
} from './session';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('verifyAdminPassword', () => {
  it('accepts the configured password', () => {
    vi.stubEnv('ADMIN_PASSWORD', '1234');
    expect(verifyAdminPassword('1234')).toBe(true);
  });

  it('rejects wrong passwords', () => {
    vi.stubEnv('ADMIN_PASSWORD', '1234');
    expect(verifyAdminPassword('0000')).toBe(false);
    expect(verifyAdminPassword('')).toBe(false);
    expect(verifyAdminPassword('12345')).toBe(false);
  });

  it('rejects everything when the password is not configured', () => {
    vi.stubEnv('ADMIN_PASSWORD', '');
    expect(verifyAdminPassword('1234')).toBe(false);
  });
});

describe('admin session tokens', () => {
  it('verifies a freshly created token', () => {
    vi.stubEnv('ADMIN_PASSWORD', '1234');
    const token = createAdminSessionToken();
    expect(verifyAdminSessionToken(token)).toBe(true);
  });

  it('rejects tampered tokens', () => {
    vi.stubEnv('ADMIN_PASSWORD', '1234');
    const token = createAdminSessionToken();
    expect(verifyAdminSessionToken(`${token}x`)).toBe(false);
    expect(verifyAdminSessionToken('999.deadbeef')).toBe(false);
    expect(verifyAdminSessionToken('garbage')).toBe(false);
    expect(verifyAdminSessionToken(null)).toBe(false);
    expect(verifyAdminSessionToken(undefined)).toBe(false);
  });

  it('rejects expired tokens', () => {
    vi.stubEnv('ADMIN_PASSWORD', '1234');
    const now = Date.now();
    const token = createAdminSessionToken(now);
    const afterExpiry = now + (ADMIN_SESSION_MAX_AGE_SECONDS + 60) * 1000;
    expect(verifyAdminSessionToken(token, afterExpiry)).toBe(false);
  });

  it('tokens signed with a different secret are rejected', () => {
    vi.stubEnv('ADMIN_PASSWORD', '1234');
    const token = createAdminSessionToken();
    vi.stubEnv('ADMIN_PASSWORD', '9999');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'another-secret');
    expect(verifyAdminSessionToken(token)).toBe(false);
  });
});