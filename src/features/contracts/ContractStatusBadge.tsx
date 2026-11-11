import { StatusBadge } from '@/components/ui/StatusBadge';

/** Contract badges: "بانتظار التوقيع" / "عقد معتمد". */
export function ContractStatusBadge({ signed }: { signed: boolean }) {
  return signed ? (
    <StatusBadge tone="success" icon="verified">عقد معتمد</StatusBadge>
  ) : (
    <StatusBadge tone="warning" icon="schedule">بانتظار التوقيع</StatusBadge>
  );
}
