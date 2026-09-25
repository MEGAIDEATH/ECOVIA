import { Spinner } from '@/components/ui/Spinner';

/** Full-screen loading state used while guards resolve. */
export function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Spinner className="w-12 h-12 border-4" />
    </div>
  );
}