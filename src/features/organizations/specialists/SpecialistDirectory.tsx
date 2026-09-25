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

/**
 * Organization tab: searchable directory of approved specialists.
 * React-state filtering (name + specialization) replaces the legacy
 * `querySelectorAll(...).style.display` implementation.
 */
export function SpecialistDirectory({ onViewCv, onContact }: SpecialistDirectoryProps) {
  const { user } = useAuth();
  const [specialists, setSpecialists] = useState<PublicSpecialistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    getApprovedSpecialists()
      .then((list) => {
        if (active) setSpecialists(list.filter((spec) => spec.id !== user?.uid));
      })
      .catch((err: unknown) => {
        console.error('[specialist-directory] load failed:', err);
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const filtered = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return specialists;
    return specialists.filter((spec) => {
      const haystack = `${spec.fullName ?? ''} ${spec.edu ?? ''}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [specialists, deferredQuery]);

  return (
    <div className="fade-up">
      <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/30 flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="org-search-input" className="sr-only">
            ابحث بالتخصص أو الاسم
          </label>
          <input
            id="org-search-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث بالتخصص أو الاسم..."
            className="w-full px-4 py-3 pl-10 bg-surface-container-low rounded-xl border border-transparent focus:border-primary outline-none transition-all text-sm"
          />
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
            search
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading && <LoadingState message="جاري التحميل..." className="col-span-full text-center p-4" />}
        {error && !loading && <ErrorState className="col-span-full text-center p-4" />}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            message={query ? 'لا توجد نتائج مطابقة' : 'لا يوجد كفاءات معتمدة'}
            className="col-span-full text-center text-slate-500 p-4"
          />
        )}
        {!loading &&
          !error &&
          filtered.map((spec) => (
            <SpecialistDirectoryCard
              key={spec.id}
              specialist={spec}
              onViewCv={() => onViewCv(spec)}
              onContact={() => onContact(spec)}
            />
          ))}
      </div>
    </div>
  );
}