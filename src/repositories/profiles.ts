import 'server-only';

import { and, asc, desc, eq, like } from 'drizzle-orm';

import { getDb } from '@/db';
import { accountEvents, organizations, specialists, user } from '@/db/schema';
import { isUuid } from '@/lib/utils/ids';
import type { AccountStatus, Organization, Specialist } from '@/types';

type SpecialistRow = typeof specialists.$inferSelect;
type OrganizationRow = typeof organizations.$inferSelect;

export function toSpecialist(row: SpecialistRow): Specialist {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    rejectionReason: row.rejectionReason,
    fullName: row.fullName,
    nationalId: row.nationalId,
    email: row.email,
    phone: row.phone,
    license: row.license,
    issueDate: row.issueDate,
    edu: row.edu,
    city: row.city,
    region: row.region,
    years: row.years,
    exp: row.exp,
    portfolio: row.portfolio,
    profilePicId: row.profileImageId,
    resumeFileId: row.resumeDocumentId,
    licenseDocId: row.licenseDocumentId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    rejectionReason: row.rejectionReason,
    orgName: row.orgName,
    crNumber: row.crNumber,
    phone: row.phone,
    orgDesc: row.orgDesc,
    businessFields: row.businessFields ?? [],
    profileImageId: row.profileImageId,
    website: row.website,
    crDocId: row.crDocumentId,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface CreateSpecialistInput {
  userId: string;
  fullName: string;
  nationalId: string;
  email: string | null;
  phone: string;
  license: string;
  issueDate?: string | null;
  licenseDocumentId?: string | null;
}

export interface CreateOrganizationInput {
  userId: string;
  orgName: string;
  crNumber: string;
  phone: string;
  orgDesc: string;
  crDocumentId?: string | null;
}

/** Creates the specialist profile. Status is always `pending` (server-side). */
export async function createSpecialist(input: CreateSpecialistInput): Promise<Specialist> {
  const rows = await getDb()
    .insert(specialists)
    .values({
      userId: input.userId,
      status: 'pending',
      fullName: input.fullName,
      nationalId: input.nationalId,
      email: input.email,
      phone: input.phone,
      license: input.license,
      issueDate: input.issueDate ?? null,
      licenseDocumentId: input.licenseDocumentId ?? null,
    })
    .returning();
  return toSpecialist(rows[0]);
}

export async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
  const rows = await getDb()
    .insert(organizations)
    .values({
      userId: input.userId,
      status: 'pending',
      orgName: input.orgName,
      crNumber: input.crNumber,
      phone: input.phone,
      orgDesc: input.orgDesc,
      crDocumentId: input.crDocumentId ?? null,
    })
    .returning();
  return toOrganization(rows[0]);
}

export async function getSpecialistByUserId(userId: string): Promise<Specialist | null> {
  const rows = await getDb()
    .select()
    .from(specialists)
    .where(eq(specialists.userId, userId))
    .limit(1);
  return rows[0] ? toSpecialist(rows[0]) : null;
}

export async function getOrganizationByUserId(userId: string): Promise<Organization | null> {
  const rows = await getDb()
    .select()
    .from(organizations)
    .where(eq(organizations.userId, userId))
    .limit(1);
  return rows[0] ? toOrganization(rows[0]) : null;
}

export async function getSpecialistById(id: string): Promise<Specialist | null> {
  if (!isUuid(id)) return null;
  const rows = await getDb().select().from(specialists).where(eq(specialists.id, id)).limit(1);
  return rows[0] ? toSpecialist(rows[0]) : null;
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  if (!isUuid(id)) return null;
  const rows = await getDb().select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return rows[0] ? toOrganization(rows[0]) : null;
}

export interface SpecialistProfilePatch {
  fullName?: string;
  email?: string | null;
  phone?: string;
  edu?: string | null;
  city?: string | null;
  region?: string | null;
  years?: string | null;
  exp?: string | null;
  portfolio?: string | null;
  profileImageId?: string | null;
  resumeDocumentId?: string | null;
}

export interface OrganizationProfilePatch {
  orgName?: string;
  phone?: string;
  orgDesc?: string;
  businessFields?: string[];
  website?: string | null;
  profileImageId?: string | null;
}

/**
 * Updates only the facility-editable fields of the caller's own organization.
 * Status, CR number and the CR document are not patchable here.
 */
export async function updateOrganizationProfile(userId: string, patch: OrganizationProfilePatch): Promise<void> {
  await getDb()
    .update(organizations)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(organizations.userId, userId));
}

/**
 * Updates only the CV fields the owner is allowed to change. Status, national
 * id, license and creation time are deliberately not patchable — the same
 * guarantee expressed by the affected-keys allowlist of the legacy rules.
 */
export async function updateSpecialistProfile(
  userId: string,
  patch: SpecialistProfilePatch,
): Promise<void> {
  await getDb()
    .update(specialists)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(specialists.userId, userId));
}


/** Approved specialists for the organization-facing directory. */
export async function listApprovedSpecialists() {
  return getDb()
    .select({
      id: specialists.id,
      userId: specialists.userId,
      status: specialists.status,
      fullName: specialists.fullName,
      edu: specialists.edu,
      city: specialists.city,
      region: specialists.region,
      years: specialists.years,
    })
    .from(specialists)
    .where(eq(specialists.status, 'approved'))
    .orderBy(specialists.fullName)
    .limit(500);
}

/** Approved organizations for the specialist-facing directory. */
export async function listApprovedOrganizations() {
  return getDb()
    .select({ id: organizations.id, orgName: organizations.orgName })
    .from(organizations)
    .where(eq(organizations.status, 'approved'))
    .limit(500);
}

export type AdminTarget = 'specialists' | 'organizations';

/**
 * Account review state machine (admin + owner), every step audited in
 * `account_events` (the rejection history is never overwritten):
 *
 *   pending  → approved   admin approves            (account.approved)
 *   pending  → rejected   admin rejects with reason (account.rejected)
 *   rejected → pending    owner resubmits after corrections (account.resubmitted)
 *                         or admin reopens the review       (account.reopened)
 *
 * Transitions are conditional updates (`WHERE status = <from>`), so a stale
 * admin screen or a double click can never jump states — e.g. a rejected
 * account cannot be approved without going back to review first.
 */
export type ReviewTransition = 'approve' | 'reject' | 'reopen' | 'resubmit';

const TRANSITIONS: Record<ReviewTransition, { from: AccountStatus; to: AccountStatus; action: string }> = {
  approve: { from: 'pending', to: 'approved', action: 'account.approved' },
  reject: { from: 'pending', to: 'rejected', action: 'account.rejected' },
  reopen: { from: 'rejected', to: 'pending', action: 'account.reopened' },
  resubmit: { from: 'rejected', to: 'pending', action: 'account.resubmitted' },
};

export type ReviewResult = 'ok' | 'not_found' | 'invalid_state';

export async function transitionAccountReview(
  target: AdminTarget,
  id: string,
  transition: ReviewTransition,
  actorUserId: string,
  reason?: string,
): Promise<ReviewResult> {
  if (!isUuid(id)) return 'not_found';
  const { from, to, action } = TRANSITIONS[transition];
  return getDb().transaction(async (tx) => {
    // Approval clears the last rejection reason; rejection sets it; reopening
    // and resubmitting keep it visible as "previous reason" until a decision.
    const values = {
      status: to,
      updatedAt: new Date(),
      ...(transition === 'approve' ? { rejectionReason: null } : {}),
      ...(transition === 'reject' ? { rejectionReason: reason ?? null } : {}),
    };
    const updated =
      target === 'specialists'
        ? await tx
            .update(specialists)
            .set(values)
            .where(and(eq(specialists.id, id), eq(specialists.status, from)))
            .returning({ id: specialists.id })
        : await tx
            .update(organizations)
            .set(values)
            .where(and(eq(organizations.id, id), eq(organizations.status, from)))
            .returning({ id: organizations.id });
    if (updated.length === 0) {
      const exists =
        target === 'specialists'
          ? await tx.select({ id: specialists.id }).from(specialists).where(eq(specialists.id, id)).limit(1)
          : await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.id, id)).limit(1);
      return exists.length ? 'invalid_state' : 'not_found';
    }
    await tx.insert(accountEvents).values({
      actorUserId,
      action,
      targetKind: target === 'specialists' ? 'specialist' : 'organization',
      targetId: id,
      detail: reason ? reason.slice(0, 500) : null,
    });
    return 'ok';
  });
}

/** Kept for callers of the original API: approve a pending account. */
export async function approveAccount(target: AdminTarget, id: string, actorUserId: string): Promise<ReviewResult> {
  return transitionAccountReview(target, id, 'approve', actorUserId);
}

/** Reject a pending account with a reason. */
export async function rejectAccount(
  target: AdminTarget,
  id: string,
  reason: string,
  actorUserId: string,
): Promise<ReviewResult> {
  return transitionAccountReview(target, id, 'reject', actorUserId, reason);
}

export interface ReviewEvent {
  action: string;
  detail: string | null;
  createdAt: string;
  byAdmin: boolean;
}

/** Review history of one profile, oldest first (admin view). */
export async function listReviewHistory(target: AdminTarget, id: string): Promise<ReviewEvent[]> {
  if (!isUuid(id)) return [];
  const rows = await getDb()
    .select({ action: accountEvents.action, detail: accountEvents.detail, createdAt: accountEvents.createdAt, role: user.role })
    .from(accountEvents)
    .leftJoin(user, eq(user.id, accountEvents.actorUserId))
    .where(
      and(
        eq(accountEvents.targetKind, target === 'specialists' ? 'specialist' : 'organization'),
        eq(accountEvents.targetId, id),
        like(accountEvents.action, 'account.%'),
      ),
    )
    .orderBy(asc(accountEvents.createdAt));
  return rows.map((row) => ({
    action: row.action,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
    byAdmin: row.role === 'admin',
  }));
}

/** Admin table rows (id + display name + status) for both account kinds. */
export async function listAccountsForAdmin() {
  const db = getDb();
  const [specialistRows, organizationRows] = await Promise.all([
    db
      .select({
        id: specialists.id,
        name: specialists.fullName,
        status: specialists.status,
        rejectionReason: specialists.rejectionReason,
        license: specialists.license,
        licenseDocId: specialists.licenseDocumentId,
        createdAt: specialists.createdAt,
      })
      .from(specialists)
      .orderBy(desc(specialists.createdAt)),
    db
      .select({
        id: organizations.id,
        name: organizations.orgName,
        status: organizations.status,
        rejectionReason: organizations.rejectionReason,
        crNumber: organizations.crNumber,
        crDocId: organizations.crDocumentId,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt)),
  ]);
  return { specialists: specialistRows, organizations: organizationRows };
}
