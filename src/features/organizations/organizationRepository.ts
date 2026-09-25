import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { getPublicOrganizations } from '@/features/directory/directoryService';
import { getDb } from '@/lib/firebase/client';
import { organizationDocPath } from '@/lib/firestore/paths';
import type { Organization } from '@/types';

export interface CreateOrganizationInput {
  orgName: string;
  crNumber: string;
  phone: string;
  orgDesc: string;
  /** Additive field — Storage URL of the uploaded commercial registration. */
  crDocUrl?: string | null;
}

type DocumentDataLike = Record<string, unknown>;

function mapOrganization(id: string, data: DocumentDataLike): Organization {
  return { id, ...(data as Omit<Organization, 'id'>) };
}

/** Creates the organization registration document (legacy field set). */
export async function createOrganization(
  uid: string,
  input: CreateOrganizationInput,
): Promise<void> {
  await setDoc(doc(getDb(), organizationDocPath(uid)), {
    // The actual write is always pending. The server-side demo policy may
  // approve it immediately afterwards, but an anonymous client cannot choose
  // its own approval status.
  status: 'pending',
    orgName: input.orgName,
    crNumber: input.crNumber,
    phone: input.phone,
    orgDesc: input.orgDesc,
    crDocUrl: input.crDocUrl ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function getOrganizationById(uid: string): Promise<Organization | null> {
  const snapshot = await getDoc(doc(getDb(), organizationDocPath(uid)));
  if (!snapshot.exists()) return null;
  return mapOrganization(snapshot.id, snapshot.data());
}

/** Approved organizations for specialist-facing directory. */
export function getApprovedOrganizations() {
  return getPublicOrganizations();
}


