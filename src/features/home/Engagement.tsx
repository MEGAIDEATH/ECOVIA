import { CommunityTopics } from './CommunityTopics';
import styles from './landing.module.css';
import { Reveal } from './Reveal';
import { RoleSwitcher } from './RoleSwitcher';
import { H2, LEAD, SectionHeading } from './SectionHeading';

const STEPS = [
  { title: 'حدّد احتياجك', body: 'تختار المنشأة الخدمة البيئية وتوضّح نطاق العمل والمستندات المطلوبة.' },
  { title: 'تعرّف على المختص', body: 'تستعرض ملفات الأخصائيين والعروض لتختار الخبرة الأنسب.' },
  { title: 'أنجزوا معًا', body: 'تُنظّم الاتفاقات والمراسلات ومتابعة التنفيذ ضمن مسار واحد.' },
  { title: 'اعتمد النتيجة', body: 'تُراجع المخرجات ويُوثّق التسليم والإغلاق والتقييم.' },
] as const;

/** Target audiences with the interactive organization / specialist tabs. */
export function Roles() {
  return (
    <section aria-labelledby="roles-title" className={styles.rolesSection}>
      <div className="container-brand grid grid-cols-1 items-center gap-7 md:grid-cols-[.77fr_1.23fr] lg:gap-16">
        <RoleSwitcher
          intro={
            <>
              <span className="kicker">لمن صُممت المنصة؟</span>
              <h2 id="roles-title" className={`${H2} mt-3`}>
                للمنشأة وللأخصائي.
              </h2>
              <p className={LEAD}>
                طلبات واضحة للمنشآت، وفرص مناسبة للأخصائيين. اختر الفئة لتتعرف على ما تقدمه المنصة.
              </p>
            </>
          }
        />
      </div>
    </section>
  );
}

/** The four-step service journey. */
export function Workflow() {
  return (
    <section aria-labelledby="steps-title" className="bg-white py-[75px] md:py-28">
      <div className="container-brand">
        <SectionHeading
          id="steps-title"
          kicker="كيف تسير الخدمة؟"
          title="امتثال بيئي أسرع."
          lead="من تحديد الخدمة إلى تسلّم المخرجات: خطوات واضحة للمنشأة والأخصائي البيئي."
        />
        <ol className="grid grid-cols-2 gap-[9px] xs:gap-3.5 md:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal
              key={step.title}
              as="li"
              className="min-h-[200px] rounded-[20px] border border-[#e8eee9] bg-[linear-gradient(170deg,#fff,#fcfdfa)] px-[15px] py-5 xs:px-6 xs:py-7 md:min-h-[225px]"
            >
              <span lang="en" className="block font-latin text-[32px] leading-none font-extrabold text-[#9dc4b1]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-[22px] mb-[7px] text-[17px] text-forest xs:text-lg">{step.title}</h3>
              <p className="m-0 text-[15px] leading-[2] text-muted xs:text-base">{step.body}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Dark community band with category previews and leaf artwork. */
export function Community() {
  return (
    <section
      id="community"
      aria-labelledby="community-title"
      className="bg-white pt-[45px] pb-[75px] md:pt-[65px] md:pb-[115px]"
    >
      <div className="container-brand">
        <Reveal className="grid min-h-[465px] grid-cols-1 overflow-hidden rounded-[30px] bg-forest md:grid-cols-2">
          <div className="self-center px-[29px] py-[38px] text-on-dark md:p-11 lg:px-[63px] lg:py-[60px]">
            <span className="kicker text-[#b1d8c3]">الجانب المجتمعي</span>
            <h2 id="community-title" className={`${H2} mt-3 mb-5 text-white`}>
              البيئة ليست خدمة فقط.
              <br />
              إنها ثقافة نشاركها.
            </h2>
            <p className="m-0 max-w-[420px] text-[15px] leading-[2.15] text-[#c9e1d7]">
              إلى جانب الخدمات المهنية، تتطلع إيكوفيا إلى تجربة مجتمعية تجمع المعرفة بالقصص والتحديات والمبادرات
              البيئية، وتحوّل الوعي إلى مشاركة حقيقية.
            </p>
            <CommunityTopics />
          </div>
          <div aria-hidden="true" className={styles.communityArt}>
            <span className={styles.artCaption}>نزرع المعرفة، فينمو الأثر.</span>
            <span className={styles.artLeaf} />
            <span className={`${styles.artLeaf} ${styles.leafTwo}`} />
            <span className={`${styles.artLeaf} ${styles.leafThree}`} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
