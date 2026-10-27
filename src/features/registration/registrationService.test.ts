import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerOrganization, registerSpecialist } from './registrationService';

const specialistInput = {
  fullName: 'خالد سعيد عبدالله',
  nationalId: '1098765432',
  phone: '0512345678',
  license: 'ELESL-2023-1234',
  issueDate: '2025-01-01',
  licenseDocId: null,
};

const organizationInput = {
  orgName: 'منشأة بيئية',
  crNumber: '1010123456',
  phone: '0512345678',
  orgDesc: 'نبذة عن المنشأة',
  crDocId: null,
};

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === '/api/register/specialist') {
        return jsonResponse({
          status: 'created',
          role: 'spec',
          accountStatus: 'pending',
          userId: 'user-1',
        });
      }
      if (url === '/api/register/organization') {
        return jsonResponse({
          status: 'created',
          role: 'org',
          accountStatus: 'pending',
          userId: 'user-1',
        });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('registrationService (server-side PostgreSQL registration)', () => {
  it('registers a specialist through the server route and returns a created pending result', async () => {
    const result = await registerSpecialist(specialistInput);

    expect(result).toEqual({
      status: 'created',
      role: 'spec',
      accountStatus: 'pending',
      userId: 'user-1',
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/register/specialist',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('registers an organization through the server route and returns a created pending result', async () => {
    const result = await registerOrganization(organizationInput);

    expect(result).toEqual({
      status: 'created',
      role: 'org',
      accountStatus: 'pending',
      userId: 'user-1',
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/register/organization',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('rejects empty fields with the Arabic message and does not call the server', async () => {
    await expect(registerSpecialist({ ...specialistInput, license: '   ' })).rejects.toThrow(
      'رقم المعاملة / الترخيص مطلوب',
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns an existing account as state — no exception', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ status: 'existing', role: 'spec', accountStatus: 'approved', userId: 'user-1' }),
    );

    const result = await registerSpecialist(specialistInput);

    expect(result).toEqual({
      status: 'existing',
      role: 'spec',
      accountStatus: 'approved',
      userId: 'user-1',
    });
  });

  it('maps server failures to the Arabic generic error', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: 'boom' }, false),
    );

    await expect(registerSpecialist(specialistInput)).rejects.toThrow(
      'boom',
    );
  });
});
