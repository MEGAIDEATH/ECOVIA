import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

import { getDb } from '@/db';
import { applications, conversations, messages, organizations, specialists } from '@/db/schema';
import { buildChatId } from '@/lib/utils/chat';
import type { Application } from '@/types';

/** The exact application message the legacy `submitApp()` sent. */
export const APPLICATION_MESSAGE = 'مرحباً، أود التقديم للعمل معكم.';

export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export interface CreateApplicationInput {
  /** Caller's user id (the specialist). */
  specialistUserId: string;
  /** Target organization profile id (`organizations.id`). */
  organizationId: string;
}

/**
 * Opens the conversation with the legacy application message AND records a
 * structured application so "سجل التقديمات السابقة" can show history. Both
 * writes happen in one transaction.
 *
 * The caller's specialist profile, the organization name and the conversation
 * are all resolved server-side — the browser only supplies the target id.
 */
export async function createApplication(input: CreateApplicationInput): Promise<Application> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const specialistRows = await tx
      .select()
      .from(specialists)
      .where(eq(specialists.userId, input.specialistUserId))
      .limit(1);
    const specialist = specialistRows[0];
    if (!specialist) throw new ApplicationError('لا يوجد ملف أخصائي لهذا الحساب.');

    const organizationRows = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .limit(1);
    const organization = organizationRows[0];
    if (!organization || organization.status !== 'approved') {
      throw new ApplicationError('الجهة غير متاحة للتقديم.');
    }

    const existingConversation = await tx
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.specialistId, specialist.id),
          eq(conversations.organizationId, organization.id),
        ),
      )
      .limit(1);
    let conversation = existingConversation[0];
    if (!conversation) {
      conversation = (
        await tx
          .insert(conversations)
          .values({ organizationId: organization.id, specialistId: specialist.id })
          .returning()
      )[0];
    }

    const insertedMessage = await tx
      .insert(messages)
      .values({
        conversationId: conversation.id,
        senderUserId: input.specialistUserId,
        body: APPLICATION_MESSAGE,
      })
      .returning();

    const insertedApplication = await tx
      .insert(applications)
      .values({
        specialistId: specialist.id,
        organizationId: organization.id,
        organizationName: organization.orgName,
        conversationId: conversation.id,
      })
      .onConflictDoNothing({ target: [applications.specialistId, applications.organizationId] })
      .returning();

    await tx
      .update(conversations)
      .set({
        lastMessage: APPLICATION_MESSAGE,
        lastMessageIsContract: false,
        lastMessageAt: insertedMessage[0].createdAt,
      })
      .where(eq(conversations.id, conversation.id));

    const application =
      insertedApplication[0] ??
      (
        await tx
          .select()
          .from(applications)
          .where(
            and(
              eq(applications.specialistId, specialist.id),
              eq(applications.organizationId, organization.id),
            ),
          )
          .limit(1)
      )[0];

    if (!application) throw new ApplicationError('تعذر إنشاء التقديم.');

    return {
      id: application.id,
      specialistId: specialist.id,
      organizationId: organization.id,
      organizationName: organization.orgName,
      status: 'submitted' as const,
      chatId: buildChatId(organization.userId, specialist.userId),
      createdAt: application.createdAt.toISOString(),
    };
  });
}

/** Application history for the caller (newest first). */
export async function listApplicationsForSpecialist(
  specialistUserId: string,
): Promise<Application[]> {
  const db = getDb();
  const rows = await db
    .select({
      application: applications,
      organizationUserId: organizations.userId,
      specialistUserId: specialists.userId,
    })
    .from(applications)
    .innerJoin(organizations, eq(organizations.id, applications.organizationId))
    .innerJoin(specialists, eq(specialists.id, applications.specialistId))
    .where(eq(specialists.userId, specialistUserId))
    .orderBy(desc(applications.createdAt))
    .limit(200);

  return rows.map((row) => ({
    id: row.application.id,
    specialistId: row.application.specialistId,
    organizationId: row.application.organizationId,
    organizationName: row.application.organizationName,
    status: row.application.status,
    chatId: buildChatId(row.organizationUserId, row.specialistUserId),
    createdAt: row.application.createdAt.toISOString(),
  }));
}
