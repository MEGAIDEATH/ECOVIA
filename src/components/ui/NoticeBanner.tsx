import { noticeMessage } from '@/lib/notices';

/** Server-rendered confirmation for `?notice=<key>` (unknown keys render nothing). */
export function NoticeBanner({ notice }: { notice: string | undefined }) {
  const message = noticeMessage(notice);
  if (!message) return null;
  return (
    <p role="status" className="alert alert-success" data-testid="notice">
      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
        check_circle
      </span>
      {message}
    </p>
  );
}
