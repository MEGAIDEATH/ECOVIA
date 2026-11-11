import { redirect } from 'next/navigation';

/** Legacy project detail ids were application ids; send users to الخدمات. */
export default function LegacyProjectDetailPage() {
  redirect('/specialist/services');
}
