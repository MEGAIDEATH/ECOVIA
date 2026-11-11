'use client';

import type { ReactNode } from 'react';

interface ChatHeaderProps {
  icon: string;
  otherName: string;
  /** Right side of the header: encrypted-channel badge (spec) or actions (org). */
  actions?: ReactNode;
}

/** Chat panel header shown while a conversation is open. */
export function ChatHeader({ icon, otherName, actions }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line bg-wash px-4 py-3">
      <h4 className="flex min-w-0 items-center gap-2 font-bold text-forest">
        <span aria-hidden="true" className="icon-tile size-9 rounded-xl">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </span>
        <span className="truncate">{otherName}</span>
      </h4>
      {actions}
    </div>
  );
}