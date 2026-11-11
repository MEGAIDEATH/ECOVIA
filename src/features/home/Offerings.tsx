import { LandingIcon, type LandingIconName } from './icons';
import { Reveal } from './Reveal';
import { SectionHeading } from './SectionHeading';

const PATHS: ReadonlyArray<{ title: string; body: string; icon: LandingIconName; tint: string }> = [
  {
    title: 'الخدمات المهنية',
    body: 'مساحة تجمع المنشآت بالأخصائيين البيئيين لإدارة الطلبات والتعاون والاتفاقات ومتابعة الخدمات.',
    icon: 'board',
    tint: 'bg-white',
  },
  {
    title: 'الوعي والمجتمع',
    body: 'معرفة بيئية في صورة محتوى وتجارب وتحديات ومبادرات تشجع المشاركة والاهتمام بالبيئة.',
    icon: 'chat',
    tint: 'bg-[#f3f8f3]',
  },
  {
    title: 'تطوير مستمر',
    body: 'نستفيد من بيانات الاستخدام لتحسين الخدمات والمحتوى واتخاذ قرارات أفضل.',
    icon: 'chart',
    tint: 'bg-[#f9f8f3]',
  },
];

const SERVICES: ReadonlyArray<{ type: string; title: string; body: string; note: string; icon: LandingIconName }> = [
  {
    type: 'إعداد المستندات',
    title: 'خطة الإدارة البيئية',
    body: 'إعداد خطة توضح الإجراءات والاشتراطات البيئية المرتبطة بنشاط المنشأة، من خلال مقدم خدمة مخوّل.',
    note: 'من متطلبات التصاريح البيئية للفئة الأولى',
    icon: 'document',
  },
  {
    type: 'تجهيز ومتابعة',
    title: 'دعم إجراءات التصريح البيئي',
    body: 'مساعدة المنشأة في تجهيز المتطلبات والملفات اللازمة للتقديم ومتابعة الإجراءات حسب نوع النشاط.',
    note: 'إصدار التصريح من اختصاص الجهة التنظيمية',
    icon: 'checklist',
  },
];

/** "ECOVIA at a glance" — the three paths of the ecosystem. */
export function Ecosystem() {
  return (
    <section aria-labelledby="ecosystem-title" className="py-[75px] md:py-28">
      <div className="container-brand">
        <SectionHeading
          id="ecosystem-title"
          kicker="إيكوفيا باختصار"
          title="ثلاثة مسارات. منظومة واحدة."
          lead="لكل طرف دور، ولكل تفاعل قيمة. تتكامل المعرفة والخدمات والبيانات لصناعة بيئة أكثر اتصالًا."
          centered
        />
        <div className="grid grid-cols-1 gap-[17px] md:grid-cols-3">
          {PATHS.map((path, index) => (
            <Reveal
              as="article"
              key={path.title}
              className={`card-interactive relative overflow-hidden rounded-3xl border border-line p-[25px] hover:-translate-y-[7px] hover:border-line-strong hover:shadow-float md:min-h-[290px] md:px-[29px] md:pt-8 md:pb-9 ${path.tint}`}
            >
              <span
                lang="en"
                className="absolute top-[29px] left-[29px] font-latin text-[11px] font-bold text-[#9caaa2]"
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="icon-tile icon-tile-lg size-[57px]">
                <LandingIcon name={path.icon} className="size-[29px]" />
              </span>
              <h3 className="mt-[15px] mb-1 block text-[23px] font-bold text-forest md:mt-[25px] md:mb-1.5">
                {path.title}
              </h3>
              <p className="m-0 text-base leading-[2] text-muted">{path.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Professional services offered in the first phase. */
export function Services() {
  return (
    <section id="services" aria-labelledby="services-title" className="bg-wash py-[75px] md:py-28">
      <div className="container-brand">
        <SectionHeading
          id="services-title"
          kicker="الخدمات المهنية"
          title="خدمات بيئية تبدأ من احتياج المنشأة."
          lead="تركز إيكوفيا في مرحلتها الأولى على احتياجات منشآت الفئة الأولى، وتساعدها على الوصول إلى مقدمي الخدمات المرخّصين."
        />
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:gap-5">
          {SERVICES.map((service) => (
            <Reveal
              as="article"
              key={service.title}
              className="card-interactive flex gap-[13px] rounded-3xl border border-[#e0eae2] bg-white p-[21px] hover:-translate-y-[5px] hover:shadow-float xs:gap-[23px] xs:px-[23px] xs:py-[26px] md:min-h-[255px] md:p-8"
            >
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-[#e7f1e9] text-forest xs:size-[62px] xs:rounded-[19px]"
              >
                <LandingIcon name={service.icon} className="size-[23px] xs:size-7" />
              </span>
              <div>
                <p className="mt-px mb-[5px] text-[15px] font-bold text-green">{service.type}</p>
                <h3 className="mt-0 mb-3 text-lg leading-[1.6] text-forest xs:text-[23px]">{service.title}</h3>
                <p className="mt-0 mb-[18px] text-base leading-[2] text-muted">{service.body}</p>
                <span className="inline-block rounded-[9px] bg-accent-soft px-[11px] py-[7px] text-sm leading-[1.8] text-[#3d7860]">
                  {service.note}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-[19px] mb-0 text-sm text-muted">
          قد تختلف المتطلبات بحسب تصنيف النشاط ونوع التصريح. الخدمات المعروضة هنا تعريفية، وتُفعّل داخل المنصة حسب
          نطاق مقدمي الخدمة المعتمدين.
        </p>
      </div>
    </section>
  );
}
