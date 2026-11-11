import { describe, expect, it } from 'vitest';

import { isDemoIdentity, normalizeIdentity, resolveDemoOtpConfig } from './otp';

const vercel = (overrides: Record<string, string>) => ({
  NODE_ENV: 'production',
  VERCEL: '1',
  ...overrides,
});

describe('resolveDemoOtpConfig', () => {
  it('enables demo for every identity in local development by default', () => {
    const config = resolveDemoOtpConfig({ NODE_ENV: 'development' });
    expect(config.active).toBe(true);
    expect(config.code).toBe('123456');
    expect(isDemoIdentity('anyone@example.com', config)).toBe(true);
  });

  it('keeps real mode by default on any deployment', () => {
    expect(resolveDemoOtpConfig(vercel({ VERCEL_ENV: 'preview' })).active).toBe(false);
    expect(resolveDemoOtpConfig(vercel({ VERCEL_ENV: 'production' })).active).toBe(false);
    expect(resolveDemoOtpConfig({ NODE_ENV: 'production' }).active).toBe(false);
  });

  it('restricts preview demo mode to the allowlist', () => {
    const config = resolveDemoOtpConfig(
      vercel({
        VERCEL_ENV: 'preview',
        OTP_MODE: 'demo',
        OTP_DEMO_CODE: '246810',
        OTP_DEMO_ALLOWLIST: 'Demo@Ecovia.test, +966 50 000 0001',
      }),
    );
    expect(config.active).toBe(true);
    expect(config.code).toBe('246810');
    expect(isDemoIdentity('demo@ecovia.test', config)).toBe(true);
    expect(isDemoIdentity('966500000001', config)).toBe(true);
    expect(isDemoIdentity('someone@else.com', config)).toBe(false);
    expect(isDemoIdentity('0500000002', config)).toBe(false);
  });

  it('rejects a wildcard, a missing code or an empty allowlist on deployments', () => {
    const base = { VERCEL_ENV: 'preview', OTP_MODE: 'demo', OTP_DEMO_CODE: '246810' };
    expect(resolveDemoOtpConfig(vercel({ ...base, OTP_DEMO_ALLOWLIST: '*' })).active).toBe(false);
    expect(resolveDemoOtpConfig(vercel({ ...base, OTP_DEMO_ALLOWLIST: '' })).active).toBe(false);
    expect(
      resolveDemoOtpConfig(
        vercel({ VERCEL_ENV: 'preview', OTP_MODE: 'demo', OTP_DEMO_ALLOWLIST: 'a@b.c' }),
      ).active,
    ).toBe(false);
  });

  it('requires an explicit production opt-in on Vercel Production', () => {
    const env = {
      VERCEL_ENV: 'production',
      OTP_MODE: 'demo',
      OTP_DEMO_CODE: '246810',
      OTP_DEMO_ALLOWLIST: 'demo@ecovia.test',
    };
    expect(resolveDemoOtpConfig(vercel(env)).active).toBe(false);
    expect(
      resolveDemoOtpConfig(vercel({ ...env, OTP_DEMO_ALLOW_PRODUCTION: 'true' })).active,
    ).toBe(true);
  });

  it('allows OTP_MODE=real to switch demo off locally', () => {
    expect(resolveDemoOtpConfig({ NODE_ENV: 'development', OTP_MODE: 'real' }).active).toBe(false);
  });
});

describe('normalizeIdentity', () => {
  it('lower-cases emails and strips phone formatting', () => {
    expect(normalizeIdentity(' Org_1@Ecovia.Local ')).toBe('org_1@ecovia.local');
    expect(normalizeIdentity('+966 (50) 123-4567')).toBe('966501234567');
  });
});
