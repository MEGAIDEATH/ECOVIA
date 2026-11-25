import type { AccountStatus, ContractStatus, OfferStatus, ServiceRequestStatus } from '@/types';

/** Visual tone of a status badge — maps 1:1 to the `.badge-*` classes. */
export type StatusTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

export interface StatusPresentation {
  label: string;
  tone: StatusTone;
}

/**
 * Single place that turns raw status values into Arabic labels + tones, so a
 * "rejected" item can never look like an "approved" one on any screen.
 */
export const SERVICE_REQUEST_STATUS: Record<ServiceRequestStatus, StatusPresentation> = {
  pending: { label: 'مفتوح للعروض', tone: 'warning' },
  accepted: { label: 'تم التعاقد', tone: 'success' },
  rejected: { label: 'مرفوض', tone: 'danger' },
  in_progress: { label: 'قيد التنفيذ', tone: 'info' },
  completed: { label: 'مكتمل', tone: 'brand' },
  cancelled: { label: 'ملغى', tone: 'neutral' },
};

/** Open request whose facility already prepared a contract (still accepting offers). */
export const CONTRACT_AWAITING_SIGNATURE: StatusPresentation = { label: 'عقد بانتظار التوقيع', tone: 'info' };

export const OFFER_STATUS: Record<OfferStatus, StatusPresentation> = {
  submitted: { label: 'عرض مقدَّم', tone: 'info' },
  selected: { label: 'تم اختياره — بانتظار توقيع العقد', tone: 'warning' },
  accepted: { label: 'تم التعاقد', tone: 'success' },
  declined: { label: 'لم يُقبل', tone: 'neutral' },
  withdrawn: { label: 'مسحوب', tone: 'neutral' },
};

export const CONTRACT_STATUS: Record<ContractStatus, StatusPresentation> = {
  pending: { label: 'مسودة — بانتظار توقيع الأخصائي', tone: 'warning' },
  signed: { label: 'عقد موقّع', tone: 'success' },
  cancelled: { label: 'عقد ملغى', tone: 'neutral' },
};

/** Specialist-side badge for a request they declined (it stays open for others). */
export const DECLINED_BY_ME: StatusPresentation = { label: 'اعتذرت عنه', tone: 'neutral' };

export const ACCOUNT_STATUS: Record<AccountStatus, StatusPresentation> = {
  pending: { label: 'قيد المراجعة', tone: 'warning' },
  approved: { label: 'مفعل', tone: 'success' },
  rejected: { label: 'مرفوض', tone: 'danger' },
};

/** Unknown values (older rows, new server states) degrade to a neutral badge. */
export function presentStatus<T extends string>(
  map: Record<T, StatusPresentation>,
  value: string | null | undefined,
): StatusPresentation {
  return (value && (map as Record<string, StatusPresentation>)[value]) || {
    label: value || '-',
    tone: 'neutral',
  };
}
