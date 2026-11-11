import Link from 'next/link';

const BUTTON =
  'btn min-h-[38px] px-2 text-[10px] hover:-translate-y-0.5 xs:px-[11px] xs:text-[11px] md:min-h-11 md:px-[21px] md:text-[13px]';

/** Landing header actions: the existing login and sign-up routes. */
export function HeaderActions() {
  return (
    <div className="flex items-center gap-1 xs:gap-1.5 md:gap-2.5">
      <Link href="/login" className={`${BUTTON} btn-secondary`}>
        تسجيل الدخول
      </Link>
      <Link href="/choose-role" className={`${BUTTON} btn-primary`}>
        إنشاء حساب
      </Link>
    </div>
  );
}
