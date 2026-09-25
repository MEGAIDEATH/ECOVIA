interface ContractStatusBadgeProps {
  signed: boolean;
}

/** Legacy contract badges: "بانتظار التوقيع" / "عقد معتمد". */
export function ContractStatusBadge({ signed }: ContractStatusBadgeProps) {
  return (
    <span
      className={
        signed
          ? 'bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold'
          : 'bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold'
      }
    >
      {signed ? 'عقد معتمد' : 'بانتظار التوقيع'}
    </span>
  );
}