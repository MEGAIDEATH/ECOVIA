import type { ReactNode } from 'react';

import type { StatusTone } from '@/lib/status';

interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  /** Optional Material Symbols icon before the label. */
  icon?: string;
  className?: string;
}

/** Pill-shaped status indicator (`.badge` + tone). */
export function StatusBadge({ tone, children, icon, className = '' }: StatusBadgeProps) {
  return (
    <span className={`badge badge-${tone} ${className}`}>
      {icon && <span aria-hidden="true" className="material-symbols-outlined text-[14px]">{icon}</span>}
      {children}
    </span>
  );
}
