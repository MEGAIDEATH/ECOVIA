import { redirect } from 'next/navigation';

/** Legacy route ("المشاريع") — the engagements now live under الخدمات. */
export default function LegacyProjectsPage() {
  redirect('/specialist/services');
}
