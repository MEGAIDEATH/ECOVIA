import type { ReactNode } from 'react';

import { BrandMark } from '@/components/brand/BrandMark';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { isApprovedStatus, OWN_PROFILE_PATH, WORKSPACE_BASE } from '@/lib/auth/access';
import type { CurrentAccount } from '@/lib/auth/policies';
import { logoutAction, switchAccountAction } from '@/server/actions/account';
import type { UserRole } from '@/types';

import { PendingApprovalBanner } from './PendingApprovalBanner';
import { WorkspaceNav, type NavTab } from './WorkspaceNav';

const APPROVED_TABS: Record<UserRole, readonly NavTab[]> = {
  spec: [
    { href: '/specialist', label: 'الرئيسية', icon: 'space_dashboard' },
    { href: '/specialist/requests', label: 'طلبات الخدمة', icon: 'assignment' },
    { href: '/specialist/services', label: 'خدماتي', icon: 'work_history' },
    { href: '/specialist/messages', label: 'المراسلات', icon: 'forum' },
    { href: '/specialist/cv', label: 'السيرة الذاتية', icon: 'badge' },
  ],
  org: [
    { href: '/organization', label: 'الرئيسية', icon: 'space_dashboard' },
    { href: '/organization/requests', label: 'طلبات الخدمة', icon: 'assignment' },
    { href: '/organization/specialists', label: 'دليل الكفاءات', icon: 'groups' },
    { href: '/organization/messages', label: 'المراسلات والعقود', icon: 'forum' },
    { href: '/organization/profile', label: 'ملف المنشأة', icon: 'domain' },
  ],
};

/** Unapproved accounts only see their own CV / facility profile. */
const PENDING_TABS: Record<UserRole, readonly NavTab[]> = {
  spec: [{ href: OWN_PROFILE_PATH.spec, label: 'السيرة الذاتية', icon: 'badge' }],
  org: [{ href: OWN_PROFILE_PATH.org, label: 'ملف المنشأة', icon: 'domain' }],
};

const ROLE_LABEL: Record<UserRole, string> = { spec: 'أخصائي', org: 'منشأة' };

interface AppShellProps {
  role: UserRole;
  account: CurrentAccount;
  unreadCount: number;
  children: ReactNode;
}

/**
 * Workspace chrome for /specialist and /organization (replaces the old
 * "workspace header" title blocks): one compact bar with the brand, the
 * workspace tabs, the notification bell, the account identity, the
 * facility ⇄ specialist switch (only when the user owns both) and logout.
 * Server-rendered; only the tabs and the bell hydrate.
 */
export function AppShell({ role, account, unreadCount, children }: AppShellProps) {
  const profile = role === 'spec' ? account.specialist! : account.organization!;
  const approved = isApprovedStatus(profile.status);
  const displayName = role === 'spec' ? account.specialist!.fullName : account.organization!.orgName;
  const imageId = role === 'spec' ? account.specialist!.profilePicId : account.organization!.profileImageId;
  const otherRole: UserRole = role === 'spec' ? 'org' : 'spec';
  const canSwitch = Boolean(role === 'spec' ? account.organization : account.specialist);
  const tabs = approved ? APPROVED_TABS[role] : PENDING_TABS[role];

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-30 border-b border-forest/10 bg-white/95 backdrop-blur-sm">
        <div className="container-brand flex min-h-[64px] items-center justify-between gap-3 py-2">
          <BrandMark href={approved ? WORKSPACE_BASE[role] : OWN_PROFILE_PATH[role]} size="sm" />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {approved && <NotificationBell initialCount={unreadCount} href={`${WORKSPACE_BASE[role]}/notifications`} />}
            <div className="hidden items-center gap-2 md:flex">
              <Avatar name={displayName} imageId={imageId} size="sm" shape={role === 'org' ? 'square' : 'circle'} />
              <div className="max-w-44 min-w-0 leading-tight">
                <p className="truncate text-sm font-bold text-forest" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-muted">حساب {ROLE_LABEL[role]}</p>
              </div>
            </div>
            {canSwitch && (
              <form action={switchAccountAction}>
                <input type="hidden" name="role" value={otherRole} />
                <button type="submit" className="btn btn-soft btn-sm gap-1" data-testid="account-switcher">
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                    swap_horiz
                  </span>
                  <span className="hidden sm:inline">التبديل إلى حساب {ROLE_LABEL[otherRole]}</span>
                  <span className="sm:hidden">{ROLE_LABEL[otherRole]}</span>
                </button>
              </form>
            )}
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary btn-sm gap-1.5 text-danger" aria-label="تسجيل الخروج">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  logout
                </span>
                <span className="hidden sm:inline">خروج</span>
              </button>
            </form>
          </div>
        </div>
        <div className="container-brand">
          <WorkspaceNav tabs={tabs} />
        </div>
      </header>
      <main className="container-brand flex-1 py-6 md:py-8">
        {!approved && (
          <PendingApprovalBanner role={role} status={profile.status} reason={profile.rejectionReason ?? null} />
        )}
        {children}
      </main>
    </div>
  );
}
