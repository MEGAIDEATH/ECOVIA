'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { formatBadgeCount, unreadLabel } from '@/lib/notifications';

const POLL_MS = 60_000;

/**
 * Navigation bell: the server renders the real unread count (`initialCount`);
 * while the page stays open it re-checks GET /api/notifications/unread-count
 * every minute and when the tab regains focus. A server re-render (e.g. after
 * marking notifications read) always wins over a stale polled value.
 */
export function NotificationBell({ initialCount, href }: { initialCount: number; href: string }) {
  const [polled, setPolled] = useState<{ base: number; count: number } | null>(null);
  const baseRef = useRef(initialCount);

  useEffect(() => {
    baseRef.current = initialCount;
  }, [initialCount]);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
        if (!res.ok || !active) return;
        const data = (await res.json()) as { count?: unknown };
        if (typeof data.count === 'number') setPolled({ base: baseRef.current, count: data.count });
      } catch {
        // Offline / transient: keep the last known count.
      }
    };
    const interval = window.setInterval(check, POLL_MS);
    const onFocus = () => void check();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const count = polled && polled.base === initialCount ? polled.count : initialCount;
  const label = `الإشعارات: ${unreadLabel(count)}`;

  return (
    <Link href={href} aria-label={label} title={label} className="btn btn-ghost btn-icon relative size-11 text-primary">
      <span aria-hidden="true" className="material-symbols-outlined text-[24px]">
        {count > 0 ? 'notifications_unread' : 'notifications'}
      </span>
      {count > 0 && (
        <span
          aria-hidden="true"
          data-testid="notification-badge"
          className="absolute -top-0.5 -end-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] leading-5 font-bold text-white"
        >
          {formatBadgeCount(count)}
        </span>
      )}
    </Link>
  );
}
