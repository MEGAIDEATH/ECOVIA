import { Suspense } from 'react';

import { Spinner } from '@/components/ui/Spinner';
import { OrganizationMessages } from '@/features/organizations/messages/OrganizationMessages';

const fallback = (
  <div className="h-[75vh] flex items-center justify-center">
    <Spinner className="w-8 h-8 border-4" />
  </div>
);

export default function OrganizationMessagesPage() {
  return (
    <Suspense fallback={fallback}>
      <OrganizationMessages />
    </Suspense>
  );
}