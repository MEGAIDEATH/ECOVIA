import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatBadgeCount, notificationHref, unreadLabel } from '@/lib/notifications';

import { NotificationBell } from './NotificationBell';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ count: 0 }))));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows a clean zero state without a badge', () => {
    render(<NotificationBell initialCount={0} href="/specialist/notifications" />);
    expect(screen.getByRole('link', { name: 'الإشعارات: لا توجد إشعارات غير مقروءة' })).toHaveAttribute(
      'href',
      '/specialist/notifications',
    );
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });

  it('caps the visual badge at 9+ while the accessible name keeps the exact number', () => {
    render(<NotificationBell initialCount={12} href="/organization/notifications" />);
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('9+');
    expect(screen.getByRole('link')).toHaveAccessibleName('الإشعارات: 12 إشعاراً غير مقروء');
  });

  it('renders the server count after a re-render (e.g. after marking read)', () => {
    const { rerender } = render(<NotificationBell initialCount={3} href="/x" />);
    expect(screen.getByTestId('notification-badge')).toHaveTextContent('3');
    rerender(<NotificationBell initialCount={0} href="/x" />);
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });
});

describe('notification helpers', () => {
  it('formats counts and labels', () => {
    expect(formatBadgeCount(4)).toBe('4');
    expect(formatBadgeCount(10)).toBe('9+');
    expect(unreadLabel(1)).toBe('إشعار واحد غير مقروء');
  });
  it('links each notification type to the right workspace record', () => {
    expect(notificationHref('request.published', 'r1')).toBe('/specialist/requests/r1');
    expect(notificationHref('offer.received', 'r1')).toBe('/organization/requests/r1');
    expect(notificationHref('contract.signed', 'c1')).toBe('/contracts/c1');
    expect(notificationHref('unknown', 'x')).toBeNull();
    expect(notificationHref('offer.received', null)).toBeNull();
  });
});
