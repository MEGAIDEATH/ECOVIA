import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination, hrefWith } from '@/features/marketplace/LinkTabs';
import { formatRelativeAr, formatDateTimeAr } from '@/lib/format';
import { notificationHref } from '@/lib/notifications';
import { listNotifications } from '@/repositories/notifications';
import { markAllNotificationsReadAction, markNotificationReadAction, openNotificationAction } from '@/server/actions/notifications';

/**
 * The session user's own notifications (newest first, paginated). Opening one
 * marks it read and navigates to its record; counters re-render from the
 * database afterwards (no client-side bookkeeping).
 */
export async function NotificationsPage({ userId, basePath, page }: { userId: string; basePath: string; page: number }) {
  const { items, hasMore } = await listNotifications(userId, page);
  const unread = items.some((item) => !item.isRead);

  return (
    <div className="fade-up">
      <PageHeader
        title="الإشعارات"
        description="طلبات منطقتك، والعروض، والعقود، وتحديثات التنفيذ."
        actions={
          unread && (
            <form action={markAllNotificationsReadAction}>
              <button type="submit" className="btn btn-secondary">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  done_all
                </span>
                تعليم الكل كمقروء
              </button>
            </form>
          )
        }
      />
      {items.length === 0 ? (
        <div className="card">
          <EmptyState message="لا توجد إشعارات بعد." />
        </div>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden" aria-label="قائمة الإشعارات">
          {items.map((item) => {
            const href = notificationHref(item.type, item.relatedId);
            return (
              <li key={item.id} className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center ${item.isRead ? '' : 'bg-accent-soft/50'}`}>
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-2.5 shrink-0 rounded-full ${item.isRead ? 'bg-transparent' : 'bg-secondary'}`}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm ${item.isRead ? 'text-on-surface' : 'font-bold text-forest'}`}>
                      {!item.isRead && <span className="sr-only">غير مقروء: </span>}
                      {item.title}
                    </p>
                    {item.message && <p className="mt-0.5 text-sm text-muted">{item.message}</p>}
                    <p className="mt-1 text-xs text-muted">
                      <time dateTime={item.createdAt} title={formatDateTimeAr(item.createdAt) ?? undefined}>
                        {formatRelativeAr(item.createdAt)}
                      </time>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 ps-5 sm:ps-0">
                  {href && (
                    <form action={openNotificationAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="back" value={basePath} />
                      <button type="submit" className="btn btn-soft btn-sm">
                        فتح
                      </button>
                    </form>
                  )}
                  {!item.isRead && (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="btn btn-ghost btn-sm" aria-label={`تعليم «${item.title}» كمقروء`}>
                        تعليم كمقروء
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} hasMore={hasMore} hrefFor={(n) => hrefWith(basePath, { page: n })} />
    </div>
  );
}
