import type { PublicSpecialistSummary } from '@/types';

interface SpecialistDirectoryCardProps {
  specialist: PublicSpecialistSummary;
  onViewCv: () => void;
  onContact: () => void;
  onPrivateRequest?: () => void;
}

/** Directory card: the specialist's name, specialization, region/city and actions. */
export function SpecialistDirectoryCard({ specialist, onViewCv, onContact, onPrivateRequest }: SpecialistDirectoryCardProps) {
  return (
    <article className="card card-interactive flex h-full flex-col p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="icon-tile shrink-0">
          <span aria-hidden="true" className="material-symbols-outlined text-[22px]">person</span>
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-bold text-forest">{specialist.fullName || 'أخصائي'}</h3>
          <p className="text-sm text-muted">{specialist.edu || 'لم يحدد التخصص'}</p>
          {(specialist.region || specialist.city) && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
              <span aria-hidden="true" className="material-symbols-outlined text-[14px]">location_on</span>
              {[specialist.city, specialist.region].filter(Boolean).join(' — ')}
            </p>
          )}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <button type="button" onClick={onViewCv} className="btn btn-secondary btn-sm flex-1">الملف</button>
        <button type="button" onClick={onContact} className="btn btn-primary btn-sm flex-1">تواصل</button>
        {onPrivateRequest && (
          <button type="button" onClick={onPrivateRequest} className="btn btn-soft btn-sm w-full">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">lock</span>
            طلب خاص
          </button>
        )}
      </div>
    </article>
  );
}
