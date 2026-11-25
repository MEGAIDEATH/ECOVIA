import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  CONTRACT_AWAITING_SIGNATURE,
  DECLINED_BY_ME,
  OFFER_STATUS,
  SERVICE_REQUEST_STATUS,
  presentStatus,
} from '@/lib/status';
import type { ServiceRequest } from '@/types';

/** Status badges for a request: lifecycle + (facility) contract awaiting signature + (specialist) own offer. */
export function RequestBadges({ request, viewer }: { request: ServiceRequest; viewer: 'org' | 'spec' }) {
  const status = presentStatus(SERVICE_REQUEST_STATUS, request.status);
  return (
    <span className="flex flex-wrap items-center justify-end gap-1.5">
      {request.visibility === 'private' && (
        <StatusBadge tone="brand" icon="lock">
          طلب خاص
        </StatusBadge>
      )}
      {request.declinedByMe ? (
        <StatusBadge tone={DECLINED_BY_ME.tone}>{DECLINED_BY_ME.label}</StatusBadge>
      ) : (
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      )}
      {request.status === 'pending' && request.hasPendingContract && viewer === 'org' && (
        <StatusBadge tone={CONTRACT_AWAITING_SIGNATURE.tone}>{CONTRACT_AWAITING_SIGNATURE.label}</StatusBadge>
      )}
      {viewer === 'spec' && request.myOfferStatus && request.myOfferStatus !== 'accepted' && (
        <StatusBadge tone={OFFER_STATUS[request.myOfferStatus].tone}>
          عرضي: {OFFER_STATUS[request.myOfferStatus].label}
        </StatusBadge>
      )}
    </span>
  );
}
