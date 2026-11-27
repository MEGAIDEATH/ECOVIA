/**
 * Integration tests for the offer → contract lifecycle against a real
 * PostgreSQL database (transactions, row locks, partial unique indexes).
 * Run: INTEGRATION_DATABASE_URL=<disposable db> npm run test:integration
 */
import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { closeDb, getDb } from '@/db';
import { accountEvents, contracts, documents, notifications, organizations, serviceRequestOffers, serviceRequests, specialists, user } from '@/db/schema';
import { specialistCanView } from '@/lib/marketplace/rules';
import { DomainError } from '@/lib/marketplace/errors';
import { getContractDocument } from '@/repositories/contracts';
import { canViewDocument } from '@/repositories/documents';
import {
  cancelRequest,
  getOwnOffer,
  listOffersForRequest,
  prepareContract,
  signContract,
  submitOffer,
  withdrawContract,
} from '@/repositories/marketplace';
import { countUnreadNotifications, markNotificationRead, notifyRegionalSpecialists } from '@/repositories/notifications';
import { createServiceRequest, getRequestWithFacts, listRequestsForSpecialist } from '@/repositories/serviceRequests';

const RUN = randomUUID().slice(0, 8);
const RIYADH = 'منطقة الرياض';
const EASTERN = 'المنطقة الشرقية';

type Spec = { id: string; userId: string; fullName: string; approved: true };
type Org = { id: string; userId: string; name: string };

async function makeUser(label: string): Promise<string> {
  const id = `it-${RUN}-${label}`;
  await getDb().insert(user).values({ id, name: label, email: `${id}@integration.test` });
  return id;
}

async function makeSpecialist(label: string, region: string | null, status: 'approved' | 'pending' = 'approved'): Promise<Spec> {
  const userId = await makeUser(label);
  const [row] = await getDb()
    .insert(specialists)
    .values({ userId, status, fullName: `أخصائي ${label} (اختبار)`, nationalId: '1000000000', phone: '0500000000', license: `LIC-${label}`, region })
    .returning();
  return { id: row.id, userId, fullName: row.fullName, approved: true };
}

async function makeOrganization(label: string): Promise<Org> {
  const userId = await makeUser(label);
  const [row] = await getDb()
    .insert(organizations)
    .values({ userId, status: 'approved', orgName: `منشأة ${label} (اختبار)`, crNumber: `7${RUN}`, phone: '0110000000', orgDesc: 'منشأة اختبار' })
    .returning();
  return { id: row.id, userId, name: row.orgName };
}

async function publish(org: Org, region = RIYADH, target: Spec | null = null) {
  return createServiceRequest(
    { organizationId: org.id, organizationUserId: org.userId, organizationName: org.name, target: target && { id: target.id, userId: target.userId } },
    {
      serviceTypes: ['activity_classification', 'environmental_management_plan'],
      activityDescription: 'مصنع اختبار يحتاج تصنيفاً بيئياً',
      notes: null,
      regionName: region,
      city: null,
      targetSpecialistId: target?.id ?? null,
    },
  );
}

const offer = { durationValue: 3, durationUnit: 'week' as const, message: 'عرض اختبار' };
const contractInput = { title: null, value: '15000', organizationSignature: 'مفوّض الاختبار' };

let facility: Org;
let riyadhA: Spec;
let riyadhB: Spec;
let eastern: Spec;
let pendingRiyadh: Spec;

beforeAll(async () => {
  facility = await makeOrganization('org');
  riyadhA = await makeSpecialist('ra', RIYADH);
  riyadhB = await makeSpecialist('rb', RIYADH);
  eastern = await makeSpecialist('ea', EASTERN);
  pendingRiyadh = await makeSpecialist('rp', RIYADH, 'pending');
});

afterAll(async () => {
  await closeDb();
});

async function notificationCount(userId: string, relatedId: string) {
  const rows = await getDb()
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.recipientUserId, userId), eq(notifications.relatedId, relatedId)));
  return rows.length;
}

describe('publishing and regional notifications', () => {
  it('notifies approved specialists of the region only — idempotently', async () => {
    const { request, notified } = await publish(facility);
    expect(notified).toBeGreaterThanOrEqual(2);
    expect(await notificationCount(riyadhA.userId, request.id)).toBe(1);
    expect(await notificationCount(riyadhB.userId, request.id)).toBe(1);
    expect(await notificationCount(eastern.userId, request.id)).toBe(0);
    expect(await notificationCount(pendingRiyadh.userId, request.id)).toBe(0);
    expect(await notificationCount(facility.userId, request.id)).toBe(0);

    // Retrying the same event inserts nothing new.
    const again = await notifyRegionalSpecialists(getDb(), {
      requestId: request.id,
      regionName: RIYADH,
      excludeUserId: facility.userId,
      title: 'x',
      message: 'y',
    });
    expect(again).toBe(0);
    expect(await notificationCount(riyadhA.userId, request.id)).toBe(1);
  });

  it('stores service types structurally and no price or duration on new requests', async () => {
    const { request } = await publish(facility);
    const [row] = await getDb().select().from(serviceRequests).where(eq(serviceRequests.id, request.id));
    expect(row.serviceTypes).toEqual(['activity_classification', 'environmental_management_plan']);
    expect(row.cost).toBeNull();
    expect(row.durationValue).toBeNull();
    expect(row.duration).toBeNull();
    expect(row.serviceName).toBeNull();
  });

  it('rejects an unknown service type at the database level too', async () => {
    await expect(
      getDb().execute(sql`insert into service_requests (organization_id, service_types, activity_description, region)
        values (${facility.id}, '{cleaning}'::service_type[], 'x', ${RIYADH})`),
    ).rejects.toThrow();
  });
});

describe('private requests', () => {
  it('are visible and answerable only by their designated specialist', async () => {
    const { request } = await publish(facility, EASTERN, riyadhA);
    const openForTarget = await listRequestsForSpecialist({ id: riyadhA.id, userId: riyadhA.userId }, 'open');
    const openForOther = await listRequestsForSpecialist({ id: riyadhB.id, userId: riyadhB.userId }, 'open');
    expect(openForTarget.items.map((r) => r.id)).toContain(request.id);
    expect(openForOther.items.map((r) => r.id)).not.toContain(request.id);

    const found = (await getRequestWithFacts(request.id))!;
    expect(specialistCanView(found.facts, riyadhB, false)).toBe(false);
    await expect(submitOffer(request.id, riyadhB, offer)).rejects.toBeInstanceOf(DomainError);
    await expect(submitOffer(request.id, riyadhA, offer)).resolves.toMatchObject({ created: true });

    expect(await notificationCount(riyadhA.userId, request.id)).toBe(1);
    expect(await notificationCount(riyadhB.userId, request.id)).toBe(0);
  });
});

describe('offers stay open until a contract is signed', () => {
  it('accepts several specialists, revises instead of duplicating, and closes only on signature', async () => {
    const { request } = await publish(facility);
    await submitOffer(request.id, riyadhA, offer);
    const revised = await submitOffer(request.id, riyadhA, { ...offer, durationValue: 2 });
    expect(revised.created).toBe(false);
    await submitOffer(request.id, riyadhB, { ...offer, durationValue: 10, durationUnit: 'day' });
    expect(await listOffersForRequest(request.id)).toHaveLength(2);
    expect((await getOwnOffer(request.id, riyadhA.id))?.durationValue).toBe(2);

    // Selecting an offer prepares a contract but does NOT close the request.
    const offerA = (await getOwnOffer(request.id, riyadhA.id))!;
    const { contractId } = await prepareContract(offerA.id, facility, contractInput);
    expect((await getRequestWithFacts(request.id))!.facts.status).toBe('pending');
    await expect(submitOffer(request.id, eastern, offer)).resolves.toMatchObject({ created: true });

    // A second pending contract for the same request is refused.
    const offerB = (await getOwnOffer(request.id, riyadhB.id))!;
    await expect(prepareContract(offerB.id, facility, contractInput)).rejects.toBeInstanceOf(DomainError);

    // Only the contract's specialist can sign it.
    await expect(signContract(contractId, riyadhB, 'محاولة')).rejects.toBeInstanceOf(DomainError);
    await signContract(contractId, riyadhA, 'أخصائي الرياض');

    const after = (await getRequestWithFacts(request.id))!;
    expect(after.facts.status).toBe('accepted');
    expect(after.facts.specialistId).toBe(riyadhA.id);
    const offers = await listOffersForRequest(request.id);
    expect(offers.find((o) => o.specialistId === riyadhA.id)?.status).toBe('accepted');
    expect(offers.filter((o) => o.specialistId !== riyadhA.id).every((o) => o.status === 'declined')).toBe(true);
    await expect(submitOffer(request.id, riyadhB, offer)).rejects.toThrow('الطلب مغلق');
    expect(await notificationCount(facility.userId, contractId)).toBe(1);
  });

  it('withdrawing a pending contract re-opens selection for another offer', async () => {
    const { request } = await publish(facility);
    await submitOffer(request.id, riyadhA, offer);
    await submitOffer(request.id, riyadhB, offer);
    const offerA = (await getOwnOffer(request.id, riyadhA.id))!;
    const { contractId } = await prepareContract(offerA.id, facility, contractInput);
    await withdrawContract(contractId, facility);
    expect((await getOwnOffer(request.id, riyadhA.id))?.status).toBe('submitted');
    const offerB = (await getOwnOffer(request.id, riyadhB.id))!;
    await expect(prepareContract(offerB.id, facility, contractInput)).resolves.toHaveProperty('contractId');
    await expect(signContract(contractId, riyadhA, 'متأخر')).rejects.toThrow('لم يعد متاحاً');
  });
});

describe('one signed contract per request (concurrency)', () => {
  it('lets exactly one of two simultaneous signatures succeed', async () => {
    const { request } = await publish(facility);
    await submitOffer(request.id, riyadhA, offer);
    const { contractId } = await prepareContract((await getOwnOffer(request.id, riyadhA.id))!.id, facility, contractInput);

    const results = await Promise.allSettled([
      signContract(contractId, riyadhA, 'توقيع 1'),
      signContract(contractId, riyadhA, 'توقيع 2'),
      signContract(contractId, riyadhA, 'توقيع 3'),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected').every((r) => (r as PromiseRejectedResult).reason instanceof DomainError)).toBe(true);
    const signed = await getDb()
      .select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.serviceRequestId, request.id), eq(contracts.status, 'signed')));
    expect(signed).toHaveLength(1);
    // Audit trail is consistent: one signing event, request closed, offer accepted.
    const events = await getDb().select().from(accountEvents).where(and(eq(accountEvents.targetId, contractId), eq(accountEvents.action, 'contract.signed')));
    expect(events).toHaveLength(1);
    expect((await getRequestWithFacts(request.id))!.facts.status).toBe('accepted');
    expect((await getOwnOffer(request.id, riyadhA.id))?.status).toBe('accepted');
  });

  it('serializes two facilities-side selections so only one contract is pending', async () => {
    const { request } = await publish(facility);
    await submitOffer(request.id, riyadhA, offer);
    await submitOffer(request.id, riyadhB, offer);
    const [a, b] = await Promise.all([getOwnOffer(request.id, riyadhA.id), getOwnOffer(request.id, riyadhB.id)]);
    const results = await Promise.allSettled([
      prepareContract(a!.id, facility, contractInput),
      prepareContract(b!.id, facility, contractInput),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('is guaranteed by the database even if application code is bypassed', async () => {
    const { request } = await publish(facility);
    await submitOffer(request.id, riyadhA, offer);
    const { contractId } = await prepareContract((await getOwnOffer(request.id, riyadhA.id))!.id, facility, contractInput);
    await signContract(contractId, riyadhA, 'موقّع');
    const [original] = await getDb().select().from(contracts).where(eq(contracts.id, contractId));
    await expect(
      getDb().insert(contracts).values({
        messageId: original.messageId,
        conversationId: original.conversationId,
        serviceRequestId: request.id,
        organizationId: facility.id,
        specialistId: riyadhB.id,
        title: 'عقد ثانٍ',
        value: '1',
        duration: 'يوم',
        organizationSignature: 'x',
        specialistSignature: 'y',
        status: 'signed',
        signedAt: new Date(),
      }),
    ).rejects.toThrow();
  });
});

describe('cancellation', () => {
  it('voids pending contracts and closes the request', async () => {
    const { request } = await publish(facility);
    await submitOffer(request.id, riyadhA, offer);
    const { contractId } = await prepareContract((await getOwnOffer(request.id, riyadhA.id))!.id, facility, contractInput);
    await cancelRequest(request.id, facility);
    const [row] = await getDb().select().from(contracts).where(eq(contracts.id, contractId));
    expect(row.status).toBe('cancelled');
    expect((await getRequestWithFacts(request.id))!.facts.status).toBe('cancelled');
    await expect(signContract(contractId, riyadhA, 'x')).rejects.toBeInstanceOf(DomainError);
  });
});

describe('record-level access', () => {
  it('shows a contract document to its two parties only', async () => {
    const { request } = await publish(facility);
    await submitOffer(request.id, riyadhA, offer);
    const { contractId } = await prepareContract((await getOwnOffer(request.id, riyadhA.id))!.id, facility, contractInput);
    const asOrg = await getContractDocument(contractId, { isAdmin: false, organizationId: facility.id, specialistId: null });
    const asSpec = await getContractDocument(contractId, { isAdmin: false, organizationId: null, specialistId: riyadhA.id });
    const asOther = await getContractDocument(contractId, { isAdmin: false, organizationId: null, specialistId: riyadhB.id });
    expect(asOrg?.viewerRole).toBe('org');
    expect(asSpec?.viewerRole).toBe('spec');
    expect(asSpec?.specialistSignature).toBeNull(); // a draft never shows a signature
    expect(asOther).toBeNull();
  });

  it('reveals a specialist permit to a facility only after a business relationship', async () => {
    const spec = await makeSpecialist(`doc${RUN.slice(0, 3)}`, RIYADH);
    const [doc] = await getDb()
      .insert(documents)
      .values({ ownerUserId: spec.userId, kind: 'license', storageKey: `it/${RUN}/${spec.id}.pdf`, contentType: 'application/pdf', sizeBytes: 10 })
      .returning();
    await getDb().update(specialists).set({ licenseDocumentId: doc.id }).where(eq(specialists.id, spec.id));
    const viewer = { userId: facility.userId, isAdmin: false, approvedOrganizationId: facility.id, approvedSpecialistId: null };
    expect(await canViewDocument(viewer, doc)).toBe(false);
    const { request } = await publish(facility);
    await submitOffer(request.id, spec, offer);
    expect(await canViewDocument(viewer, doc)).toBe(true);
    // Another specialist never sees it.
    expect(
      await canViewDocument({ userId: riyadhB.userId, isAdmin: false, approvedOrganizationId: null, approvedSpecialistId: riyadhB.id }, doc),
    ).toBe(false);
  });

  it('marks notifications read only for their recipient', async () => {
    const { request } = await publish(facility);
    const [mine] = await getDb()
      .select()
      .from(notifications)
      .where(and(eq(notifications.recipientUserId, riyadhA.userId), eq(notifications.relatedId, request.id)));
    const before = await countUnreadNotifications(riyadhA.userId);
    expect(await markNotificationRead(riyadhB.userId, mine.id)).toBeNull();
    expect(await countUnreadNotifications(riyadhA.userId)).toBe(before);
    expect((await markNotificationRead(riyadhA.userId, mine.id))?.isRead).toBe(true);
    expect(await countUnreadNotifications(riyadhA.userId)).toBe(before - 1);
  });

  it('never cascades a user deletion into signed contracts', async () => {
    const spec = await makeSpecialist(`del${RUN.slice(0, 3)}`, RIYADH);
    const { request } = await publish(facility);
    await submitOffer(request.id, spec, offer);
    const { contractId } = await prepareContract((await getOwnOffer(request.id, spec.id))!.id, facility, contractInput);
    await signContract(contractId, spec, 'موقّع');
    await expect(getDb().delete(user).where(eq(user.id, spec.userId))).rejects.toThrow();
    const [row] = await getDb().select({ status: contracts.status }).from(contracts).where(eq(contracts.id, contractId));
    expect(row.status).toBe('signed');
    const offers = await getDb().select().from(serviceRequestOffers).where(eq(serviceRequestOffers.specialistId, spec.id));
    expect(offers).toHaveLength(1);
  });
});
