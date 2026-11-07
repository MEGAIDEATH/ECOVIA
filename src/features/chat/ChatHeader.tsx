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
    <div className="bg-surface-container-low p-4 border-b border-outline-variant/50 flex justify-between items-center shadow-sm">
      <h4 className="font-bold text-primary flex items-center gap-2 truncate">
        <span className="material-symbols-outlined">{icon}</span>
        <span className="truncate">{otherName}</span>
      </h4>
      {actions}
    </div>
  );
}