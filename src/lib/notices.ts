/**
 * One-shot confirmations after a lifecycle action. Actions redirect to the
 * record page with `?notice=<key>` and the server renders the message, so the
 * confirmation survives the re-render even when the button that triggered it
 * disappears (e.g. "select offer" once a contract exists).
 */
export const NOTICES = {
  contract_prepared: 'تم إعداد العقد وإرساله للأخصائي للتوقيع. يبقى الطلب مفتوحاً للعروض حتى التوقيع.',
  contract_withdrawn: 'تم سحب العقد، وعاد العرض إلى قائمة العروض المقدَّمة.',
  contract_signed: 'تم توقيع العقد. أصبحت الأخصائي المتعاقد على هذا الطلب، وأُغلق الطلب أمام العروض الجديدة.',
  offer_declined: 'تم الاعتذار عن العرض، وأُبلغ الأخصائي.',
  offer_withdrawn: 'تم سحب عرضك.',
  request_cancelled: 'تم إلغاء الطلب وإبلاغ مقدّمي العروض.',
  request_declined: 'تم الاعتذار عن الطلب، وما زال متاحاً لبقية الأخصائيين.',
  decline_undone: 'أُعيد الطلب إلى قائمتك.',
  status_in_progress: 'بدأ تنفيذ الخدمة، وأُبلغت المنشأة.',
  status_completed: 'تم إنهاء الخدمة، وأُبلغت المنشأة.',
} as const;

export type NoticeKey = keyof typeof NOTICES;

export function noticeMessage(value: string | undefined): string | null {
  return value && value in NOTICES ? NOTICES[value as NoticeKey] : null;
}
