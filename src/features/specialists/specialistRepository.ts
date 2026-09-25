import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type UpdateData,
} from 'firebase/firestore';

import { getPublicSpecialists } from '@/features/directory/directoryService';
import { getDb } from '@/lib/firebase/client';
import { specialistDocPath } from '@/lib/firestore/paths';
import type { Specialist } from '@/types';

export interface CreateSpecialistInput {
  fullName: string;
  nationalId: string;
  email: string;
  phone: string;
  license: string;
  /** Additive field — legacy forms collected it but never persisted it. */
  issueDate?: string | null;
  /** Additive field — Storage URL of the scanned license document. */
  licenseDocUrl?: string | null;
}

/** CV editor fields persisted on save (mirrors the legacy `saveCVSpecialist`). */
export interface SpecialistProfilePatch {
  fullName?: string;
  email?: string;
  phone?: string;
  edu?: string | null;
  years?: string | null;
  exp?: string | null;
  portfolio?: string | null;
  profilePic?: string | null;
  resumeFile?: string | null;
}

function mapSpecialist(id: string, data: DocumentDataLike): Specialist {
  return { id, ...(data as Omit<Specialist, 'id'>) };
}

type DocumentDataLike = Record<string, unknown>;

/** Creates the specialist registration document (legacy field set, plus issueDate). */
export async function createSpecialist(uid: string, input: CreateSpecialistInput): Promise<void> {
  await setDoc(doc(getDb(), specialistDocPath(uid)), {
    // The actual write is always pending. The server-side demo policy may
  // approve it immediately afterwards, but an anonymous client cannot choose
  // its own approval status.
  status: 'pending',
    fullName: input.fullName,
    nationalId: input.nationalId,
    email: input.email,
    phone: input.phone,
    license: input.license,
    issueDate: input.issueDate ?? null,
    licenseDocUrl: input.licenseDocUrl ?? null,
    createdAt: serverTimestamp(),
  });
}

export async function getSpecialistById(uid: string): Promise<Specialist | null> {
  const snapshot = await getDoc(doc(getDb(), specialistDocPath(uid)));
  if (!snapshot.exists()) return null;
  return mapSpecialist(snapshot.id, snapshot.data());
}

/** Approved specialists for organization-facing directory. */
export function getApprovedSpecialists() {
  return getPublicSpecialists();
}

export async function updateSpecialistProfile(
  uid: string,
  patch: SpecialistProfilePatch,
): Promise<void> {
  // Firestore SDK boundary: UpdateData's mapped key type is not structurally
  // satisfied by a named interface, so the patch is asserted once, here.
  await updateDoc(
    doc(getDb(), specialistDocPath(uid)),
    patch as unknown as UpdateData<DocumentData>,
  );
}
