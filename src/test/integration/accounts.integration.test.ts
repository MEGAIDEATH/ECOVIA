/**
 * Account review (approve / reject / reopen / resubmit) and second-profile
 * integrity against a real database.
 */
import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { closeDb, getDb } from '@/db';
import { organizations, specialists, user } from '@/db/schema';
import { listReviewHistory, transitionAccountReview } from '@/repositories/profiles';

const RUN = randomUUID().slice(0, 8);

async function makeUser(label: string): Promise<string> {
  const id = `acct-${RUN}-${label}`;
  await getDb().insert(user).values({ id, name: label, email: `${id}@integration.test` });
  return id;
}

async function pendingSpecialist(label: string) {
  const userId = await makeUser(label);
  const [row] = await getDb()
    .insert(specialists)
    .values({ userId, fullName: `مراجعة ${label} (اختبار)`, nationalId: '1000000000', phone: '0500000000', license: 'LIC' })
    .returning();
  return { id: row.id, userId };
}

afterAll(async () => {
  await closeDb();
});

const status = async (id: string) =>
  (await getDb().select({ status: specialists.status }).from(specialists).where(eq(specialists.id, id)))[0].status;

describe('account review state machine', () => {
  it('rejects, refuses direct approval, accepts resubmission and keeps the full history', async () => {
    const admin = await makeUser('admin');
    const spec = await pendingSpecialist('a');

    expect(await transitionAccountReview('specialists', spec.id, 'reject', admin, 'الترخيص غير واضح')).toBe('ok');
    expect(await status(spec.id)).toBe('rejected');
    // A rejected account cannot be approved without going back to review.
    expect(await transitionAccountReview('specialists', spec.id, 'approve', admin)).toBe('invalid_state');
    expect(await status(spec.id)).toBe('rejected');

    // The owner resubmits after correcting: pending again, still unapproved.
    expect(await transitionAccountReview('specialists', spec.id, 'resubmit', spec.userId, 'أرفقت ترخيصاً أوضح')).toBe('ok');
    expect(await status(spec.id)).toBe('pending');
    const [row] = await getDb().select().from(specialists).where(eq(specialists.id, spec.id));
    expect(row.rejectionReason).toBe('الترخيص غير واضح'); // previous reason stays visible

    expect(await transitionAccountReview('specialists', spec.id, 'approve', admin)).toBe('ok');
    const history = await listReviewHistory('specialists', spec.id);
    expect(history.map((event) => event.action)).toEqual(['account.rejected', 'account.resubmitted', 'account.approved']);
    expect(history[0].detail).toBe('الترخيص غير واضح');
    const [approved] = await getDb().select().from(specialists).where(eq(specialists.id, spec.id));
    expect(approved.rejectionReason).toBeNull();
  });

  it('lets an admin reopen a rejected review, and only from rejected', async () => {
    const admin = await makeUser('admin2');
    const spec = await pendingSpecialist('b');
    expect(await transitionAccountReview('specialists', spec.id, 'reopen', admin)).toBe('invalid_state');
    await transitionAccountReview('specialists', spec.id, 'reject', admin, 'سبب');
    expect(await transitionAccountReview('specialists', spec.id, 'reopen', admin, 'إعادة نظر')).toBe('ok');
    expect(await status(spec.id)).toBe('pending');
    expect((await listReviewHistory('specialists', spec.id)).map((e) => e.action)).toEqual(['account.rejected', 'account.reopened']);
  });

  it('serializes double approval: exactly one transition is recorded', async () => {
    const admin = await makeUser('admin3');
    const spec = await pendingSpecialist('c');
    const results = await Promise.all([
      transitionAccountReview('specialists', spec.id, 'approve', admin),
      transitionAccountReview('specialists', spec.id, 'approve', admin),
    ]);
    expect(results.filter((r) => r === 'ok')).toHaveLength(1);
    expect((await listReviewHistory('specialists', spec.id)).filter((e) => e.action === 'account.approved')).toHaveLength(1);
  });

  it('reports unknown and malformed ids as not found', async () => {
    expect(await transitionAccountReview('specialists', randomUUID(), 'approve', 'x')).toBe('not_found');
    expect(await transitionAccountReview('organizations', 'not-a-uuid', 'approve', 'x')).toBe('not_found');
  });
});

describe('second profile on one login', () => {
  it('allows one specialist and one facility profile per user, never two of a kind', async () => {
    const spec = await pendingSpecialist('dual');
    await getDb()
      .insert(organizations)
      .values({ userId: spec.userId, orgName: 'منشأة مزدوجة (اختبار)', crNumber: '7999', phone: '011', orgDesc: 'اختبار' });
    const orgs = await getDb().select().from(organizations).where(eq(organizations.userId, spec.userId));
    expect(orgs).toHaveLength(1);
    expect(orgs[0].status).toBe('pending'); // never auto-approved
    await expect(
      getDb().insert(organizations).values({ userId: spec.userId, orgName: 'مكررة', crNumber: '1', phone: '1', orgDesc: 'x' }),
    ).rejects.toThrow();
  });
});
