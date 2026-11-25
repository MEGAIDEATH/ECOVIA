import { StatusBadge } from '@/components/ui/StatusBadge';
import { CONTRACT_STATUS } from '@/lib/status';
import type { ContractStatus } from '@/types';

/** Contract badge: draft awaiting signature / signed / cancelled — never ambiguous. */
export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const presentation = CONTRACT_STATUS[status];
  const icon = status === 'signed' ? 'verified' : status === 'cancelled' ? 'block' : 'schedule';
  return (
    <StatusBadge tone={presentation.tone} icon={icon}>
      {presentation.label}
    </StatusBadge>
  );
}
