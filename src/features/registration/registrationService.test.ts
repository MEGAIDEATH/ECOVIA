import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerOrganization, registerSpecialist } from './registrationService';

const clientMock = vi.hoisted(() => ({ getFirebaseAuth: vi.fn() }));
vi.mock('@/lib/firebase/client', () => clientMock);

const specialistRepoMock = vi.hoisted(() => ({
  createSpecialist: vi.fn(),
  getSpecialistById: vi.fn(),
}));
vi.mock('@/features/specialists/specialistRepository', () => specialistRepoMock);

const organizationRepoMock = vi.hoisted(() => ({
  createOrganization: vi.fn(),
  getOrganizationById: vi.fn(),
}));
vi.mock('@/features/organizations/organizationRepository', () => organizationRepoMock);

const specialistInput = {
  fullName: 'خالد سعيد عبدالله',
  nationalId: '1098765432',
  email: 'khaled@example.com',
  phone: '0512345678',
  license: 'ELESL-2023-1234',
  issueDate: '2025-01-01',
  licenseDocUrl: null,
};

const organizationInput = {
  orgName: 'منشأة بيئية',
  crNumber: '1010123456',
  phone: '0512345678',
  orgDesc: 'نبذة عن المنشأة',
  crDocUrl: null,
};

beforeEach(() => {
  clientMock.getFirebaseAuth.mockReturnValue({ currentUser: { uid: 'uid-1' } });
  specialistRepoMock.createSpecialist.mockReset().mockResolvedValue(undefined);
  specialistRepoMock.getSpecialistById.mockReset().mockResolvedValue(null);
  organizationRepoMock.createOrganization.mockReset().mockResolvedValue(undefined);
  organizationRepoMock.getOrganizationById.mockReset().mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('registrationService (client-side Firestore writes)', () => {
  it('writes the specialist document directly and returns a created pending result', async () => {
    const result = await registerSpecialist(specialistInput);

    expect(result).toEqual({
      status: 'created',
      role: 'spec',
      accountStatus: 'pending',
      uid: 'uid-1',
    });
    expect(specialistRepoMock.createSpecialist).toHaveBeenCalledWith('uid-1', specialistInput);
  });

  it('writes the organization document directly and returns a created pending result', async () => {
    const result = await registerOrganization(organizationInput);

    expect(result).toEqual({
      status: 'created',
      role: 'org',
      accountStatus: 'pending',
      uid: 'uid-1',
    });
    expect(organizationRepoMock.createOrganization).toHaveBeenCalledWith('uid-1', organizationInput);
  });

  it('never performs a server request (no Admin SDK dependency at signup)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await registerSpecialist(specialistInput);
    await registerOrganization(organizationInput);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects empty fields with the Arabic message and does not write', async () => {
    await expect(registerSpecialist({ ...specialistInput, license: '   ' })).rejects.toThrow(
      'رقم المعاملة / الترخيص مطلوب',
    );
    expect(specialistRepoMock.createSpecialist).not.toHaveBeenCalled();
  });

  it('rejects an invalid email before writing', async () => {
    await expect(
      registerSpecialist({ ...specialistInput, email: 'not-an-email' }),
    ).rejects.toThrow('البريد الإلكتروني غير صالح');
    expect(specialistRepoMock.createSpecialist).not.toHaveBeenCalled();
  });

  it('returns an existing pending specialist account as state — no exception, no duplicate write', async () => {
    specialistRepoMock.getSpecialistById.mockResolvedValue({ id: 'uid-1', status: 'pending' });

    const result = await registerSpecialist(specialistInput);

    expect(result).toEqual({
      status: 'existing',
      role: 'spec',
      accountStatus: 'pending',
      uid: 'uid-1',
    });
    expect(specialistRepoMock.createSpecialist).not.toHaveBeenCalled();
  });

  it('returns an existing approved specialist account as state — no exception, no duplicate write', async () => {
    specialistRepoMock.getSpecialistById.mockResolvedValue({ id: 'uid-1', status: 'approved' });

    const result = await registerSpecialist(specialistInput);

    expect(result).toEqual({
      status: 'existing',
      role: 'spec',
      accountStatus: 'approved',
      uid: 'uid-1',
    });
    expect(specialistRepoMock.createSpecialist).not.toHaveBeenCalled();
  });

  it('returns an existing pending organization account as state — no exception, no duplicate write', async () => {
    organizationRepoMock.getOrganizationById.mockResolvedValue({ id: 'uid-1', status: 'pending' });

    const result = await registerOrganization(organizationInput);

    expect(result).toEqual({
      status: 'existing',
      role: 'org',
      accountStatus: 'pending',
      uid: 'uid-1',
    });
    expect(organizationRepoMock.createOrganization).not.toHaveBeenCalled();
  });

  it('returns an existing approved organization account as state — no exception, no duplicate write', async () => {
    organizationRepoMock.getOrganizationById.mockResolvedValue({ id: 'uid-1', status: 'approved' });

    const result = await registerOrganization(organizationInput);

    expect(result).toEqual({
      status: 'existing',
      role: 'org',
      accountStatus: 'approved',
      uid: 'uid-1',
    });
    expect(organizationRepoMock.createOrganization).not.toHaveBeenCalled();
  });

  it('maps Firestore write failures to the Arabic generic error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    specialistRepoMock.createSpecialist.mockRejectedValue(new Error('permission-denied'));

    await expect(registerSpecialist(specialistInput)).rejects.toThrow(
      'تعذر إتمام التسجيل، حاول مرة أخرى.',
    );
    consoleError.mockRestore();
  });

  it('requires an authenticated (anonymous) session', async () => {
    clientMock.getFirebaseAuth.mockReturnValue({ currentUser: null });

    await expect(registerSpecialist(specialistInput)).rejects.toThrow('يرجى تسجيل الدخول أولاً.');
  });
});
