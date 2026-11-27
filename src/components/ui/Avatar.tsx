import { fileUrl } from '@/lib/utils/cv';

const SIZES = { sm: 'size-9 text-xs', md: 'size-12 text-sm', lg: 'size-20 text-xl' } as const;

/** Initials of an Arabic or Latin name (first letters of the first two words). */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').replace(/\(.*?\)/g, '').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join('') || '؟';
}

/**
 * Profile picture / facility logo served through the authorized file route,
 * with an initials fallback when there is no image. Purely presentational.
 */
export function Avatar({
  name,
  imageId,
  size = 'md',
  shape = 'circle',
}: {
  name: string | null | undefined;
  imageId?: string | null;
  size?: keyof typeof SIZES;
  shape?: 'circle' | 'square';
}) {
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-[14px]';
  const src = fileUrl(imageId);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${SIZES[size]} ${radius} shrink-0 border border-line bg-white object-cover`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} ${radius} inline-grid shrink-0 place-items-center bg-accent-soft font-bold text-secondary`}
    >
      {initialsOf(name)}
    </span>
  );
}
