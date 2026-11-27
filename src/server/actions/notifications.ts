'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isApprovedStatus } from '@/lib/auth/access';
import { requireAuthenticatedUser } from '@/lib/auth/policies';
import { ForbiddenError } from '@/lib/auth/session';
import { notificationHref } from '@/lib/notifications';
import { safeRedirectPath } from '@/lib/utils/url';
import { isUuid } from '@/lib/utils/ids';
import { markAllNotificationsRead, markNotificationRead } from '@/repositories/notifications';

import { formString } from './result';

/** Notifications are an approved-account feature (pending users receive none). */
async function requireNotificationsUser() {
  const account = await requireAuthenticatedUser();
  const approved =
    isApprovedStatus(account.specialist?.status) || isApprovedStatus(account.organization?.status);
  if (!approved) throw new ForbiddenError();
  return account;
}

/**
 * Opens one notification: marks it read (only if it belongs to the session
 * user — another user's id matches nothing) and navigates to its record.
 */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const account = await requireNotificationsUser();
  const id = formString(formData, 'id');
  const back = safeRedirectPath(formString(formData, 'back')) ?? '/dashboard';
  const notification = isUuid(id) ? await markNotificationRead(account.user.id, id) : null;
  revalidatePath('/', 'layout');
  redirect((notification && notificationHref(notification.type, notification.relatedId)) || back);
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const account = await requireNotificationsUser();
  const id = formString(formData, 'id');
  if (isUuid(id)) await markNotificationRead(account.user.id, id);
  revalidatePath('/', 'layout');
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const account = await requireNotificationsUser();
  await markAllNotificationsRead(account.user.id);
  revalidatePath('/', 'layout');
}
