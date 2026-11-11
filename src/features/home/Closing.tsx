import Image from 'next/image';
import Link from 'next/link';

import { BrandMark } from '@/components/brand/BrandMark';

import { CurrentYear, FooterUtilities } from './FooterUtilities';
import styles from './landing.module.css';
import { Reveal } from './Reveal';
import { H2, LEAD, SectionHeading } from './SectionHeading';

const FAQS = [
  {
    q: 'ما هي منصة إيكوفيا؟',
    a: 'منصة بيئية سعودية تجمع المنشآت والأخصائيين البيئيين والمجتمع في منظومة تربط الخدمات المهنية بالتوعية البيئية وتحسين التجربة عبر البيانات.',
  },
  {
    q: 'هل يمكن لأي شخص تصفح المحتوى البيئي؟',
    a: 'تستهدف منظومة التوعية أفراد المجتمع المهتمين بالبيئة. أما تقديم الخدمات المهنية أو طلبها فيرتبط بالحساب والصلاحيات والمتطلبات الخاصة بكل فئة.',
  },
  {
    q: 'كيف يتم اعتماد الأخصائي البيئي؟',
    a: 'تتضمن متطلبات المنتج تقديم بيانات المؤهلات والترخيص المهني والتحقق منها قبل إتاحة تقديم الخدمات المهنية وظهور الملف للمنشآت.',
  },
  {
    q: 'من هي المنشآت المستهدفة أولًا؟',
    a: 'تركز المرحلة الأولى على منشآت الفئة الأولى، مع تصور للتوسع إلى فئات واحتياجات أخرى مستقبلًا.',
  },
  {
    q: 'هل تُصدر إيكوفيا التصريح البيئي؟',
    a: 'لا. تساعد المنصة على الوصول إلى مقدمي الخدمات المؤهلين لإعداد الملفات والمساعدة في الإجراءات، أما التصريح فيصدر من المركز الوطني للرقابة على الالتزام البيئي.',
  },
  {
    q: 'هل تُدار العقود والمدفوعات داخل المنصة؟',
    a: 'تتضمن الرؤية التشغيلية إدارة الاتفاقات وتوثيق الخدمات والتسليم واستكمال الالتزامات المالية. تفاصيل تفعيل الدفع والتكامل مع مزوده تخضع لمرحلة التنفيذ والاعتماد.',
  },
] as const;

const MISSION = [
  { title: 'رؤيتنا', body: 'منظومة رقمية تجمع الخبرات والخدمات والمعرفة وتدعم ممارسات بيئية أفضل.' },
  { title: 'هدفنا', body: 'تسهيل الوصول إلى المتخصصين، وتنظيم دورة الخدمة، وإتاحة المعرفة البيئية للمجتمع.' },
] as const;

/** About ECOVIA: introduction, vision/mission and the founder card. */
export function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="bg-white py-[75px] md:py-28">
      <div className="container-brand grid grid-cols-1 items-center gap-[38px] md:grid-cols-[1.12fr_.88fr] lg:gap-[82px]">
        <Reveal>
          <span className="kicker">عن إيكوفيا</span>
          <h2 id="about-title" className={`${H2} max-w-[650px]`}>
            لأن الوصول إلى الخدمة البيئية لازم يكون أوضح.
          </h2>
          <p className={LEAD}>
            إيكوفيا مشروع منصة سعودية تجمع المنشآت والأخصائيين البيئيين والمجتمع، بحيث تصبح الخدمات المهنية والمعرفة
            البيئية أقرب لمن يحتاجها، في مكان واحد.
          </p>
          <div className="mt-[34px] grid grid-cols-1 gap-[13px] xs:grid-cols-2 xs:gap-5 md:gap-7">
            {MISSION.map((item) => (
              <div key={item.title} className="border-t-2 border-[#d7e5dc] pt-[15px]">
                <h3 className="text-[17px] font-bold text-green">{item.title}</h3>
                <p className="mt-1.5 mb-0 text-base leading-[1.95] text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal
          as="article"
          className="w-full max-w-[420px] justify-self-center overflow-hidden rounded-[26px] border border-[#dfeae2] bg-[#f5f8f5] shadow-[0_20px_42px_rgba(15,61,54,.06)] md:max-w-[400px]"
        >
          <div className="relative h-[280px] overflow-hidden bg-mist xs:h-[295px]">
            <Image
              src="/assets/rayan-metwally.png"
              alt="صورة ريان متولي، مؤسس مشروع إيكوفيا"
              fill
              sizes="(min-width: 768px) 400px, 420px"
              className="object-cover object-[center_31%] saturate-[.92]"
            />
          </div>
          <div className="px-7 pt-5 pb-[25px]">
            <span className="text-[15px] font-bold text-green">مؤسس المشروع</span>
            <h3 className="mt-[5px] mb-1 text-2xl text-forest">ريان متولي</h3>
            <p className="m-0 text-base text-muted">صاحب الرؤية وراء إيكوفيا.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Six FAQs on native <details> — keyboard and screen-reader friendly, no JS. */
export function FAQ() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-cloud py-[75px] md:pt-[100px] md:pb-[105px]">
      <div className="container-brand grid grid-cols-1 gap-[30px] md:grid-cols-[.75fr_1.25fr] md:gap-[75px]">
        <SectionHeading
          id="faq-title"
          kicker="معلومات تهمك"
          title="أسئلة قبل البداية."
          lead="إجابات مختصرة عن فكرة إيكوفيا وآلية الاستفادة منها."
          className="mb-0"
        />
        <Reveal className="grid content-start gap-2.5">
          {FAQS.map((item) => (
            <details key={item.q} className={`${styles.faqItem} rounded-[15px] border border-[#e5ebe6] bg-white px-[22px]`}>
              <summary className="flex items-center justify-between gap-[18px] py-[18px] text-[17px] font-bold text-forest">
                {item.q}
              </summary>
              <p className="mb-5 text-base leading-[2] text-muted">{item.a}</p>
            </details>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/** Closing call to action → account creation. */
export function FinalCTA() {
  return (
    <section aria-labelledby="cta-title" className="bg-white py-[70px] md:pt-[90px] md:pb-[100px]">
      <div className="container-brand">
        <Reveal className="flex flex-col items-start justify-between gap-[35px] rounded-[26px] border border-[#225c50] bg-[linear-gradient(120deg,#0b302b,#144d43_60%,#226354)] px-7 py-[34px] shadow-[0_24px_65px_rgba(15,61,54,.16)] md:flex-row md:items-center md:px-[60px] md:py-[54px]">
          <div>
            <span className="kicker text-on-dark-muted">ابدأ مع إيكوفيا</span>
            <h2
              id="cta-title"
              className="mt-0 mb-2 text-[clamp(29px,7.4vw,36px)] leading-[1.46] tracking-[-.045em] text-[#f7fcf8] md:text-[clamp(34px,3.2vw,44px)]"
            >
              مستقبل أكثر اتصالًا بالبيئة.
            </h2>
            <p className="m-0 text-base leading-[1.95] text-[#dcece3] md:text-[17px]">
              مساحة واحدة تجمع الفرص والخبرات والمعرفة. هذه بداية الأثر.
            </p>
          </div>
          <Link
            href="/choose-role"
            className="btn min-h-[50px] bg-[#e8f4eb] px-[26px] text-[15px] text-[#103b31] shadow-[0_8px_20px_rgba(0,0,0,.12)] hover:-translate-y-0.5 hover:bg-white md:text-base"
          >
            إنشاء حساب
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-pine pt-[57px] pb-[30px] text-[#c2d9cf]">
      <div className="container-brand">
        <div className="flex flex-col items-start justify-between gap-[25px] pb-11 md:flex-row md:items-center">
          <BrandMark tone="light" />
          <p className="max-w-[440px] text-[15px] leading-[2] text-[#9fbdb0]">
            منظومة رقمية سعودية تقرّب بين الخدمات البيئية والمعرفة والمجتمع، وتمنح كل تفاعل فرصة لصناعة أثر مستدام.
          </p>
        </div>
        <div className="flex flex-col items-start justify-between gap-5 border-t border-white/15 pt-[23px] text-[13px] text-[#8bada1] md:flex-row md:items-center">
          <p className="m-0">
            © <CurrentYear /> <span lang="en">ECOVIA</span> · إيكوفيا. جميع الحقوق محفوظة.
          </p>
          <FooterUtilities />
        </div>
      </div>
    </footer>
  );
}
