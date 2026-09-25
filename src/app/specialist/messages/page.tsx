import { Suspense } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { SpecialistMessages } from '@/features/specialists/messages/SpecialistMessages';

const fallback = (
  <div className="h-[75vh] flex items-center justify-center">
    <Spinner className="w-8 h-8 border-4" />
  </div>
);

export default function SpecialistMessagesPage() {
  return (
    <Suspense fallback={fallback}>
      <SpecialistMessages />
    </Suspense>
  );
}