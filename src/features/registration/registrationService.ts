'use client';

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
      userId: string;
    }
  | {
      status: 'existing';
      role: 'spec' | 'org';
      accountStatus: AccountStatus;
      userId: string;
    };

const GENERIC_ERROR_MESSAGE = 'تعذر إتمام التسجيل، حاول مرة أخرى.';

export async function registerSpecialist(
  input: SpecialistRegistrationInput,
): Promise<RegistrationResult> {
  const parsed = specialistRegistrationPayloadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? GENERIC_ERROR_MESSAGE);
  }

  const res = await fetch('/api/register/specialist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });

  const body = (await res.json().catch(() => null)) as {
    error?: string;
    status: 'created' | 'existing';
    role: 'spec';
    accountStatus: AccountStatus;
    userId: string;
  } | null;

  if (!res.ok || !body) {
    throw new Error(body?.error || GENERIC_ERROR_MESSAGE);
  }

  if (body.status === 'created') {
    return { status: 'created', role: 'spec', accountStatus: 'pending', userId: body.userId };
  }
  return { status: 'existing', role: 'spec', accountStatus: body.accountStatus, userId: body.userId };
}

export async function registerOrganization(
  input: OrganizationRegistrationInput,
): Promise<RegistrationResult> {
  const parsed = organizationRegistrationPayloadSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? GENERIC_ERROR_MESSAGE);
  }

  const res = await fetch('/api/register/organization', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });

  const body = (await res.json().catch(() => null)) as {
    error?: string;
    status: 'created' | 'existing';
    role: 'org';
    accountStatus: AccountStatus;
    userId: string;
  } | null;

  if (!res.ok || !body) {
    throw new Error(body?.error || GENERIC_ERROR_MESSAGE);
  }

  if (body.status === 'created') {
    return { status: 'created', role: 'org', accountStatus: 'pending', userId: body.userId };
  }
  return { status: 'existing', role: 'org', accountStatus: body.accountStatus, userId: body.userId };
}
