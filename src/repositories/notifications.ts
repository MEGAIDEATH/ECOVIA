import 'server-only';

import { and, count, desc, eq, sql } from 'drizzle-orm';

import { getDb, type Database } from '@/db';
import { notifications } from '@/db/schema';
import type { AppNotification, NotificationType } from '@/types';

/**
 * Persisted in-app notifications.
 *
 * Every write carries a `dedupeKey` (`<event>:<record id>[:<variant>]`); the
 * unique index (recipient_user_id, dedupe_key) plus ON CONFLICT DO NOTHING
 * make event fan-out idempotent and safe to retry. Writes accept the caller's
 * transaction so a notification exists if and only if its event committed.
 */
type Executor = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

export interface NewNotification {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  relatedId?: string | null;
  dedupeKey: string;
}

export async function notify(executor: Executor, items: NewNotification | NewNotification[]): Promise<void> {
  const rows = (Array.isArray(items) ? items : [items]).filter((item) => item.recipientUserId);
  if (rows.length === 0) return;
  await executor
    .insert(notifications)
    .values(
      rows.map((item) => ({
        recipientUserId: item.recipientUserId,
        type: item.type,
        title: item.title.slice(0, 200),
        message: item.message ? item.message.slice(0, 500) : null,
        relatedId: item.relatedId ?? null,
        dedupeKey: item.dedupeKey,
      })),
    )
    .onConflictDoNothing({ target: [notifications.recipientUserId, notifications.dedupeKey] });
}

/**
 * Regional fan-out for a newly published PUBLIC request: every APPROVED
 * specialist whose region matches — never everyone, never pending accounts,
 * never the publishing facility's own user. Returns the number inserted.
 */
export async function notifyRegionalSpecialists(
  executor: Executor,
  input: { requestId: string; regionName: string; excludeUserId: string; title: string; message: string },
): Promise<number> {
  const dedupeKey = `request.published:${input.requestId}`;
  const result = await executor.execute(sql`
    insert into notifications (recipient_user_id, type, title, message, related_id, dedupe_key)
    select s.user_id, 'request.published', ${input.title.slice(0, 200)}, ${input.message.slice(0, 500)}, ${input.requestId}::uuid, ${dedupeKey}
    from specialists s
    where s.status = 'approved' and s.region = ${input.regionName} and s.user_id <> ${input.excludeUserId}
    on conflict (recipient_user_id, dedupe_key) do nothing
  `);
  return result.rowCount ?? 0;
}

function toNotification(row: typeof notifications.$inferSelect): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    relatedId: row.relatedId,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const rows = await getDb()
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.recipientUserId, userId), eq(notifications.isRead, false)));
  return Number(rows[0]?.n ?? 0);
}

export const NOTIFICATIONS_PAGE_SIZE = 30;

/** The recipient's own notifications only, newest first. */
export async function listNotifications(
  userId: string,
  page = 1,
): Promise<{ items: AppNotification[]; hasMore: boolean }> {
  const rows = await getDb()
    .select()
    .from(notifications)
    .where(eq(notifications.recipientUserId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(NOTIFICATIONS_PAGE_SIZE + 1)
    .offset((page - 1) * NOTIFICATIONS_PAGE_SIZE);
  return { items: rows.slice(0, NOTIFICATIONS_PAGE_SIZE).map(toNotification), hasMore: rows.length > NOTIFICATIONS_PAGE_SIZE };
}

/**
 * Marks one notification read — scoped by recipient, so another user's id
 * simply matches nothing. Returns the notification when it belongs to `userId`.
 */
export async function markNotificationRead(userId: string, notificationId: string): Promise<AppNotification | null> {
  const db = getDb();
  await db
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientUserId, userId),
        eq(notifications.isRead, false),
      ),
    );
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.recipientUserId, userId)))
    .limit(1);
  return rows[0] ? toNotification(rows[0]) : null;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const updated = await getDb()
    .update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.recipientUserId, userId), eq(notifications.isRead, false)))
    .returning({ id: notifications.id });
  return updated.length;
}
