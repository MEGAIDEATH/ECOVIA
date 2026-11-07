'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback';
import { useAuth } from '@/features/auth/AuthProvider';
import { getApprovedSpecialists } from '@/features/specialists/specialistRepository';
import type { PublicSpecialistSummary } from '@/types';

import { SpecialistDirectoryCard } from './SpecialistDirectoryCard';

interface SpecialistDirectoryProps {
  onViewCv: (specialist: PublicSpecialistSummary) => void;
  onContact: (specialist: PublicSpecialistSummary) => void;
}

function parseYears(value: PublicSpecialistSummary['years']): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

const YEAR_OPTIONS = [
  { value: '', label: 'كل الخبرات' },
  { value: '0-2', label: '0–2 سنوات' },
  { value: '3-5', label: '3–5 سنوات' },
  { value: '6-10', label: '6–10 سنوات' },
  { value: '11+', label: 'أكثر من 10 سنوات' },
];

export function SpecialistDirectory({ onViewCv, onContact }: SpecialistDirectoryProps) {
  const { user } = useAuth();
  const [specialists, setSpecialists] = useState<PublicSpecialistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [yearsFilter, setYearsFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;
    getApprovedSpecialists()
      .then((list) => {
        if (active) setSpecialists(list.filter((spec) => spec.userId !== user?.id));
      })
      .catch((err: unknown) => {
        console.error('[specialist-directory] load failed:', err);
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user?.id]);

  const filtered = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    return specialists.filter((spec) => {
      if (normalized) {
        const haystack = `${spec.fullName ?? ''} ${spec.edu ?? ''}`.toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }
      if (cityFilter.trim()) {
        if ((spec.city ?? '').toLowerCase() !== cityFilter.trim().toLowerCase()) return false;
      }
      if (yearsFilter) {
        const n = parseYears(spec.years);
        if (n === null) return false;
        if (yearsFilter === '0-2' && !(n >= 0 && n <= 2)) return false;
        if (yearsFilter === '3-5' && !(n >= 3 && n <= 5)) return false;
        if (yearsFilter === '6-10' && !(n >= 6 && n <= 10)) return false;
        if (yearsFilter === '11+' && !(n >= 11)) return false;
      }
      return true;
    });
  }, [specialists, deferredQuery, yearsFilter, cityFilter]);

  const hasFilters = Boolean(query.trim() || yearsFilter || cityFilter);

  const clearFilters = () => {
    setQuery('');
    setYearsFilter('');
    setCityFilter('');
  };

  return (
    <div className="fade-up">
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col gap-3">
        <div className="flex gap-2 flex-col md:flex-row">
          <div className="relative flex-1">
            <label htmlFor="org-search-input" className="sr-only">ابحث بالتخصص أو الاسم</label>
            <input
              id="org-search-input"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث بالتخصص أو الاسم..."
              className="w-full px-4 py-3 pl-10 bg-surface-container-low rounded-xl border border-transparent focus:border-primary outline-none transition-all text-sm"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary">search</span>
          </div>
          <div className="md:w-56">
            <label htmlFor="years-filter" className="sr-only">فلترة حسب سنوات الخبرة</label>
            <select
              id="years-filter"
              value={yearsFilter}
              onChange={(event) => setYearsFilter(event.target.value)}
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-transparent focus:border-primary outline-none transition-all text-sm"
            >
              {YEAR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="md:w-48">
            <label htmlFor="city-filter" className="sr-only">فلترة حسب المدينة</label>
            <input
              id="city-filter"
              type="text"
              value={cityFilter}
              onChange={(event) => setCityFilter(event.target.value)}
              placeholder="المدينة..."
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-transparent focus:border-primary outline-none transition-all text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-secondary">
          <span>{hasFilters ? 'تم تطبيق الفلاتر' : 'لا توجد فلاتر نشطة'}</span>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-primary font-bold hover:underline">مسح الفلاتر</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading && <LoadingState message="جاري التحميل..." className="col-span-full text-center p-4" />}
        {error && !loading && <ErrorState className="col-span-full text-center p-4" />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState message={hasFilters ? 'لا توجد نتائج مطابقة' : 'لا يوجد كفاءات معتمدة'} className="col-span-full text-center text-slate-500 p-4" />
        )}
        {!loading && !error && filtered.map((spec) => (
          <SpecialistDirectoryCard key={spec.id} specialist={spec} onViewCv={() => onViewCv(spec)} onContact={() => onContact(spec)} />
        ))}
      </div>
    </div>
  );
}
