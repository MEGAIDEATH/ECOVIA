import { formatDateTimeAr } from '@/lib/format';
import { formatCost } from '@/lib/serviceRequests';
import { serviceTypeLabel } from '@/lib/serviceTypes';
import type { ContractDocument } from '@/repositories/contracts';

const ROW = 'grid grid-cols-1 gap-1 border-b border-line py-3 sm:grid-cols-[12rem_1fr]';

/**
 * The contract as a document. Drafts (awaiting the specialist) and cancelled
 * contracts are labelled as such in large type and are never presented as
 * signed. Signatures are typed names confirmed in the platform — the document
 * says so explicitly.
 */
export function ContractDocumentView({ contract, id }: { contract: ContractDocument; id: string }) {
  const numeric = Number(contract.value);
  const signed = contract.status === 'signed';
  return (
    <article id={id} className="card relative overflow-hidden p-6 md:p-10" aria-label={`عقد: ${contract.title}`}>
      {!signed && (
        <p
          role="note"
          className={`mb-6 rounded-card border-2 border-dashed p-4 text-center text-lg font-bold ${
            contract.status === 'cancelled' ? 'border-outline text-muted' : 'border-warning/50 text-warning'
          }`}
          data-testid="contract-draft-banner"
        >
          {contract.status === 'cancelled'
            ? 'عقد ملغى — لم يُوقّع ولا يترتب عليه أي التزام.'
            : 'مسودة عقد — غير موقّعة بعد من الأخصائي.'}
        </p>
      )}
      <header className="mb-6 text-center">
        <p className="text-xs tracking-[.2em] text-muted" lang="en">
          ECOVIA
        </p>
        <h1 className="mt-1 text-2xl font-bold text-forest">عقد تقديم خدمة بيئية</h1>
        <p className="mt-1 text-sm text-muted">{contract.title}</p>
        <p className="mt-1 font-mono text-xs text-muted" dir="ltr">
          #{contract.id}
        </p>
      </header>

      <section aria-labelledby="parties" className="mb-6">
        <h2 id="parties" className="mb-2 text-base font-bold text-forest">
          الطرفان
        </h2>
        <dl>
          <div className={ROW}>
            <dt className="text-sm font-bold text-muted">الطرف الأول (المنشأة)</dt>
            <dd>
              {contract.organization.name} — سجل تجاري رقم <span className="font-mono">{contract.organization.crNumber}</span>
            </dd>
          </div>
          <div className={ROW}>
            <dt className="text-sm font-bold text-muted">الطرف الثاني (الأخصائي)</dt>
            <dd>
              {contract.specialist.name} — ترخيص رقم <span className="font-mono">{contract.specialist.license}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="scope" className="mb-6">
        <h2 id="scope" className="mb-2 text-base font-bold text-forest">
          موضوع العقد
        </h2>
        <dl>
          {contract.request && (
            <>
              <div className={ROW}>
                <dt className="text-sm font-bold text-muted">الخدمة</dt>
                <dd>
                  {contract.request.serviceTypes.length > 0
                    ? contract.request.serviceTypes.map(serviceTypeLabel).join('، ')
                    : contract.request.serviceName}
                </dd>
              </div>
              {contract.request.activityDescription && (
                <div className={ROW}>
                  <dt className="text-sm font-bold text-muted">وصف النشاط</dt>
                  <dd className="whitespace-pre-wrap">{contract.request.activityDescription}</dd>
                </div>
              )}
              {contract.request.notes && (
                <div className={ROW}>
                  <dt className="text-sm font-bold text-muted">ملاحظات المنشأة</dt>
                  <dd className="whitespace-pre-wrap">{contract.request.notes}</dd>
                </div>
              )}
              <div className={ROW}>
                <dt className="text-sm font-bold text-muted">الموقع</dt>
                <dd>{[contract.request.region, contract.request.city].filter(Boolean).join(' — ')}</dd>
              </div>
            </>
          )}
          <div className={ROW}>
            <dt className="text-sm font-bold text-muted">مدة التنفيذ</dt>
            <dd>{contract.duration}</dd>
          </div>
          <div className={ROW}>
            <dt className="text-sm font-bold text-muted">قيمة العقد</dt>
            <dd>{Number.isFinite(numeric) ? formatCost(numeric) : contract.value}</dd>
          </div>
          {contract.offer?.message && (
            <div className={ROW}>
              <dt className="text-sm font-bold text-muted">عرض الأخصائي</dt>
              <dd className="whitespace-pre-wrap">{contract.offer.message}</dd>
            </div>
          )}
        </dl>
      </section>

      <section aria-labelledby="signatures">
        <h2 id="signatures" className="mb-3 text-base font-bold text-forest">
          التوقيعات
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-control border border-line bg-wash p-4 text-center">
            <p className="text-xs font-bold text-muted">عن المنشأة</p>
            <p className="mt-2 text-lg font-bold text-forest">{contract.organizationSignature}</p>
            <p className="mt-1 text-xs text-muted">{formatDateTimeAr(contract.organizationSignedAt ?? contract.createdAt)}</p>
          </div>
          <div className="rounded-control border border-line bg-wash p-4 text-center">
            <p className="text-xs font-bold text-muted">الأخصائي</p>
            {signed ? (
              <>
                <p className="mt-2 text-lg font-bold text-success">{contract.specialistSignature}</p>
                <p className="mt-1 text-xs text-muted">{formatDateTimeAr(contract.signedAt)}</p>
              </>
            ) : (
              <p className="mt-2 text-sm font-bold text-warning">{contract.status === 'cancelled' ? 'لم يوقّع' : 'بانتظار التوقيع'}</p>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          التوقيعات في هذه الوثيقة أسماء مكتوبة أقرّ بها الطرفان داخل منصة إيكوفيا وسُجّل وقتها في سجل التدقيق، ولا تمثل
          توقيعاً إلكترونياً موثّقاً من جهة تصديق.
        </p>
      </section>
    </article>
  );
}
