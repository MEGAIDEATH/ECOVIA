'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Field, describedBy } from '@/components/ui/Field';
import { LoadingButton } from '@/components/ui/LoadingButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/Toast';
import {
  DURATION_LIMITS,
  DURATION_UNIT_LABELS,
  DURATION_UNITS,
  SAUDI_REGIONS,
  formatCost,
  formatDuration,
  isSaudiRegion,
  parseCost,
  parseDuration,
  type DurationUnit,
} from '@/lib/serviceRequests';

interface FormData {
  serviceName: string;
  cost: string;
  durationValue: string;
  durationUnit: DurationUnit;
  region: string;
  city: string;
  serviceCategory: string;
  description: string;
}

type Errors = Partial<Record<'serviceName' | 'cost' | 'duration' | 'region', string>>;

const INITIAL: FormData = {
  serviceName: '',
  cost: '',
  durationValue: '',
  durationUnit: 'month',
  region: '',
  city: '',
  serviceCategory: '',
  description: '',
};

/** Same rules as POST /api/service-requests (shared helpers). */
function validate(data: FormData): Errors {
  const errors: Errors = {};
  if (!data.serviceName.trim()) errors.serviceName = 'اسم الخدمة مطلوب';
  if (!data.cost.trim()) errors.cost = 'تكلفة الخدمة مطلوبة';
  else if (parseCost(data.cost) === null) errors.cost = 'أدخل مبلغًا صحيحًا غير سالب (حتى منزلتين عشريتين)';
  if (!data.durationValue.trim()) errors.duration = 'المدة المطلوبة مطلوبة';
  else if (!parseDuration(data.durationValue, data.durationUnit))
    errors.duration = `أدخل عددًا صحيحًا بين 1 و${DURATION_LIMITS[data.durationUnit]}`;
  if (!isSaudiRegion(data.region)) errors.region = 'المنطقة مطلوبة';
  return errors;
}

/** Organization publishes a general service request to the marketplace. */
export function OrganizationRequestNew() {
  const router = useRouter();
  const { showToast } = useToast();
  const [data, setData] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setData((previous) => ({ ...previous, [key]: value }));

  const submit = async () => {
    if (submitting) return;
    const next = validate(data);
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: data.serviceName.trim(),
          cost: data.cost.trim(),
          durationValue: Number(data.durationValue),
          durationUnit: data.durationUnit,
          region: data.region,
          city: data.city.trim() || undefined,
          serviceCategory: data.serviceCategory.trim() || undefined,
          description: data.description.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || 'تعذر نشر الطلب');
      showToast('تم نشر طلب الخدمة العامة');
      router.push(`/organization/requests/${body.id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'حدث خطأ', true);
    } finally {
      setSubmitting(false);
    }
  };

  const cost = parseCost(data.cost);
  const duration = parseDuration(data.durationValue, data.durationUnit);

  return (
    <div className="fade-up">
      <PageHeader
        title="نشر طلب خدمة عامة"
        description="سيظهر الطلب للأخصائيين البيئيين المعتمدين بالاسم والتكلفة والمدة والمنطقة، ويمكن لأحدهم قبوله."
        back={{ href: '/organization/requests', label: 'طلبات الخدمة العامة' }}
      />
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="card max-w-3xl p-5 md:p-7"
      >
        <fieldset className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <legend className="mb-4 text-sm font-bold text-forest">بيانات الطلب الأساسية</legend>

          <Field id="req-name" label="اسم الخدمة" required error={errors.serviceName} className="md:col-span-2">
            <input
              id="req-name"
              type="text"
              value={data.serviceName}
              onChange={(e) => set('serviceName', e.target.value)}
              aria-invalid={Boolean(errors.serviceName)}
              aria-describedby={describedBy('req-name', { error: errors.serviceName })}
              placeholder="مثال: إعداد خطة الإدارة البيئية"
              maxLength={200}
              className="field-input"
            />
          </Field>

          <Field
            id="req-cost"
            label="تكلفة الخدمة (ريال)"
            required
            error={errors.cost}
            hint={cost !== null && !errors.cost ? formatCost(cost) : 'المبلغ المعروض على الأخصائي، دون عملة.'}
          >
            <input
              id="req-cost"
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={data.cost}
              onChange={(e) => set('cost', e.target.value.replace(/[^\d.]/g, ''))}
              aria-invalid={Boolean(errors.cost)}
              aria-describedby={describedBy('req-cost', { error: errors.cost, hint: true })}
              placeholder="15000"
              className="field-input text-left"
            />
          </Field>

          <Field
            id="req-duration"
            label="المدة المطلوبة"
            required
            error={errors.duration}
            hint={duration && !errors.duration ? formatDuration(duration.value, duration.unit) : undefined}
          >
            <div className="flex gap-2">
              <input
                id="req-duration"
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={data.durationValue}
                onChange={(e) => set('durationValue', e.target.value.replace(/\D/g, ''))}
                aria-invalid={Boolean(errors.duration)}
                aria-describedby={describedBy('req-duration', { error: errors.duration, hint: Boolean(duration) })}
                placeholder="2"
                className="field-input w-24 shrink-0 text-center"
              />
              <label htmlFor="req-duration-unit" className="sr-only">
                وحدة المدة
              </label>
              <select
                id="req-duration-unit"
                value={data.durationUnit}
                onChange={(e) => set('durationUnit', e.target.value as DurationUnit)}
                className="field-input flex-1"
              >
                {DURATION_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {DURATION_UNIT_LABELS[unit]}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field id="req-region" label="المنطقة" required error={errors.region}>
            <select
              id="req-region"
              value={data.region}
              onChange={(e) => set('region', e.target.value)}
              aria-invalid={Boolean(errors.region)}
              aria-describedby={describedBy('req-region', { error: errors.region })}
              className="field-input"
            >
              <option value="">اختر المنطقة</option>
              {SAUDI_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>

        <fieldset className="mt-6 grid grid-cols-1 gap-5 border-t border-line pt-6 md:grid-cols-2">
          <legend className="mb-4 text-sm font-bold text-forest">تفاصيل إضافية (اختياري)</legend>
          <Field id="req-city" label="المدينة">
            <input id="req-city" type="text" value={data.city} onChange={(e) => set('city', e.target.value)} maxLength={100} className="field-input" />
          </Field>
          <Field id="req-category" label="تصنيف الخدمة">
            <input
              id="req-category"
              type="text"
              value={data.serviceCategory}
              onChange={(e) => set('serviceCategory', e.target.value)}
              placeholder="مثال: الامتثال البيئي"
              maxLength={200}
              className="field-input"
            />
          </Field>
          <Field id="req-description" label="وصف نطاق العمل" className="md:col-span-2">
            <textarea
              id="req-description"
              value={data.description}
              onChange={(e) => set('description', e.target.value)}
              className="field-input"
              rows={4}
              maxLength={5000}
            />
          </Field>
        </fieldset>

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-5">
          <Link href="/organization/requests" className="btn btn-secondary">
            إلغاء
          </Link>
          <LoadingButton type="submit" loading={submitting} loadingLabel="جاري النشر..." showSpinner className="btn btn-primary">
            نشر الطلب
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
