/**
 * Where a notification leads. Derived from its type + related record (not
 * stored), so links follow route changes. Shared by server and client.
 */
import type { NotificationType } from '@/types';

const SPECIALIST_REQUEST: ReadonlySet<string> = new Set<NotificationType>([
  'request.published',
  'request.private',
  'offer.declined',
  'contract.prepared',
  'contract.withdrawn',
  'request.awarded_elsewhere',
  'request.cancelled',
]);

const ORGANIZATION_REQUEST: ReadonlySet<string> = new Set<NotificationType>([
  'offer.received',
  'offer.updated',
  'offer.withdrawn',
  'request.status',
]);

export function notificationHref(type: string, relatedId: string | null): string | null {
  if (!relatedId) return null;
  if (SPECIALIST_REQUEST.has(type)) return `/specialist/requests/${relatedId}`;
  if (ORGANIZATION_REQUEST.has(type)) return `/organization/requests/${relatedId}`;
  if (type === 'contract.signed') return `/contracts/${relatedId}`;
  return null;
}

/** Visual cap for the counter badge; the exact number stays in accessible text. */
export function formatBadgeCount(count: number): string {
  return count > 9 ? '9+' : String(count);
}

export function unreadLabel(count: number): string {
  if (count === 0) return 'لا توجد إشعارات غير مقروءة';
  if (count === 1) return 'إشعار واحد غير مقروء';
  if (count === 2) return 'إشعاران غير مقروءين';
  if (count <= 10) return `${count} إشعارات غير مقروءة`;
  return `${count} إشعاراً غير مقروء`;
}
