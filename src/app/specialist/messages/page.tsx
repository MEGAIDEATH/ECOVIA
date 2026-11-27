import type { Metadata } from 'next';
import { Suspense } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { SpecialistMessages } from '@/features/specialists/messages/SpecialistMessages';
import { requireWorkspacePage } from '@/lib/auth/policies';

export const metadata: Metadata = { title: 'المراسلات' };

const fallback = (
  <div className="flex h-[75vh] items-center justify-center">
    <Spinner className="h-8 w-8 border-4" />
  </div>
);

/** Chat (approved accounts only). The chat island polls the authorized chat API. */
export default async function MessagesPage() {
  await requireWorkspacePage('spec', 'approved', '/specialist/messages');
  return (
    <Suspense fallback={fallback}>
      <SpecialistMessages />
    </Suspense>
  );
}
