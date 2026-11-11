import { redirect } from 'next/navigation';

/** "تقديم للمنشآت" was removed; keep old links working. */
export default function LegacyOrganizationsPage() {
  redirect('/specialist');
}
