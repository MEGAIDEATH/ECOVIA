import type { ReactNode } from 'react';

/** Stroke icons from the original landing artwork (24×24, currentColor). */
const PATHS = {
  plus: (
    <>
      <path d="M4 12h16M12 4v16" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  trend: (
    <>
      <path d="m4 14 5-5 4 4 7-7" />
      <path d="M16 6h4v4" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4c-9-1-15 3-16 10 0 4 3 6 7 5 7-1 10-7 9-15Z" />
      <path d="M6 21c2-6 5-9 11-12" />
    </>
  ),
  board: (
    <>
      <rect height="17" rx="3" width="18" x="3" y="4" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16v11H9l-5 4V5Z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
  chart: (
    <>
      <path d="M3 19h18M6 15V8M12 15V5M18 15v-4" />
      <circle cx="6" cy="7" r="1" />
      <circle cx="12" cy="4" r="1" />
      <circle cx="18" cy="10" r="1" />
    </>
  ),
  document: (
    <>
      <path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5M8 12h8M8 16h6" />
    </>
  ),
  checklist: (
    <>
      <rect height="18" rx="2" width="16" x="4" y="3" />
      <path d="M8 8h8M8 12h8M8 16l2 2 5-5" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5.3 20c.2-4.2 2.4-6.2 6.7-6.2s6.5 2 6.7 6.2" />
    </>
  ),
  building: (
    <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-4h4v4" />
  ),
  community: (
    <>
      <circle cx="12" cy="7" r="3" />
      <path d="M6.5 20v-1.2a5.5 5.5 0 0 1 11 0V20" />
      <path d="M4.8 10.1a2.5 2.5 0 1 1 1-4.7M3.7 19.4v-.9c0-2.4.9-3.9 2.6-4.4M19.2 10.1a2.5 2.5 0 1 0-1-4.7M20.3 19.4v-.9c0-2.4-.9-3.9-2.6-4.4" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type LandingIconName = keyof typeof PATHS;

export function LandingIcon({ name, className = '' }: { name: LandingIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
