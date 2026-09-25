'use client';

import {
  createOrganization,
  getOrganizationById,
} from '@/features/organizations/organizationRepository';
import {
  createSpecialist,
  getSpecialistById,
} from '@/features/specialists/specialistRepository';
import { getFirebaseAuth } from '@/lib/firebase/client';
import {
  organizationRegistrationPayloadSchema,
  specialistRegistrationPayloadSchema,
  type OrganizationRegistrationPayload,
  type SpecialistRegistrationPayload,
} from '@/lib/validation/registration';
import type { AccountStatus } from '@/types';

export type SpecialistRegistrationInput = SpecialistRegistrationPayload;
export type OrganizationRegistrationInput = OrganizationRegistrationPayload;

export type RegistrationResult =
  | {
      status: 'created';
      role: 'spec' | 'org';
      accountStatus: 'pending';
      uid: string;
    }
  | {
      status: 'existing';
      role: 'spec' | 'org';
      accountStatus: AccountStatus;
      uid: string;
    };

const GENERIC_ERROR_MESSAGE = 'تعذر إتمام التسجيل، حاول مرة أخرى.';

/**
 * Registration writes straight to Firestore from the browser.
 *
 * Reasons this must not go through a server-only Admin SDK route (previous
 * behavior): public signup then failed with 503 whenever the optional service
 * account was not configured. Firestore rules already restrict creation to the
 * signed-in owner and force `status: 'pending'`, so the client path is safe;
 * approval stays privileged in the admin dashboard.
 */
function requireCurrentUid(): string {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error('يرجى تسجيل الدخول أولاً.');
  return user.uid;
}

export async function registerSpecialist(
  input: SpecialistRegistrationInput,
): Promise<RegistrationResult> {
  const uid = requireCurrentUid();

  const parsed = specialistRegistrationPayloadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? GENERIC_ERROR_MESSAGE);
  }

  const existing = await getSpecialistById(uid);
  if (existing) {
    return {
      status: 'existing',
      role: 'spec',
      accountStatus: existing.status,
      uid,
    };
  }

  try {
    await createSpecialist(uid, parsed.data);
  } catch (error) {
    console.error('[registration] specialist write failed:', error);
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  return {
    status: 'created',
    role: 'spec',
    accountStatus: 'pending',
    uid,
  };
}

export async function registerOrganization(
  input: OrganizationRegistrationInput,
): Promise<RegistrationResult> {
  const uid = requireCurrentUid();

  const parsed = organizationRegistrationPayloadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? GENERIC_ERROR_MESSAGE);
  }

  const existing = await getOrganizationById(uid);
  if (existing) {
    return {
      status: 'existing',
      role: 'org',
      accountStatus: existing.status,
      uid,
    };
  }

  try {
    await createOrganization(uid, parsed.data);
  } catch (error) {
    console.error('[registration] organization write failed:', error);
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  return {
    status: 'created',
    role: 'org',
    accountStatus: 'pending',
    uid,
  };
}
