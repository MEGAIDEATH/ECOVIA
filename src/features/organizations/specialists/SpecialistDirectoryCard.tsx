import type { PublicSpecialistSummary } from '@/types';

interface SpecialistDirectoryCardProps {
  specialist: PublicSpecialistSummary;
  onViewCv: () => void;
  onContact: () => void;
}

/** Approved specialist card (name, specialization, الملف, تواصل). */
export function SpecialistDirectoryCard({ specialist, onViewCv, onContact }: SpecialistDirectoryCardProps) {
  return (
    <div className="org-card-spec bg-white p-6 rounded-2xl border flex flex-col h-full shadow-sm">
      <h4 className="font-bold text-slate-800 text-lg mb-1">{specialist.fullName || 'أخصائي'}</h4>
      <p className="text-sm text-slate-500 mb-4">{specialist.edu || 'لم يحدد التخصص'}</p>
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={onViewCv}
          className="flex-1 py-2 bg-slate-100 font-bold rounded-lg hover:bg-slate-200 text-xs text-slate-800 transition-colors"
        >
          الملف
        </button>
        <button
          type="button"
          onClick={onContact}
          className="flex-[2] py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-xs transition-colors"
        >
          تواصل
        </button>
      </div>
    </div>
  );
}