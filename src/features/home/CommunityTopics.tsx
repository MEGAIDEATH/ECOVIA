'use client';

import { useState } from 'react';

import styles from './landing.module.css';

const TOPICS = [
  {
    key: 'articles',
    label: 'محتوى بيئي',
    preview: 'مقالات مبسطة وقصص من واقع البيئة السعودية، بعيدًا عن النصائح المكررة.',
  },
  {
    key: 'experiences',
    label: 'تجارب تفاعلية',
    preview: 'تجارب توضح الظواهر البيئية بالاستكشاف، مثل تأثير غياب الأكسجين على الاحتراق.',
  },
  {
    key: 'challenges',
    label: 'تحديات ومبادرات',
    preview: 'أسئلة ومسابقات ومبادرات بيئية تشجع على التعلم والمشاركة.',
  },
] as const;

type TopicKey = (typeof TOPICS)[number]['key'];

/** Community category buttons with a live preview (destinations not built yet). */
export function CommunityTopics() {
  const [active, setActive] = useState<TopicKey>('articles');
  const [interacted, setInteracted] = useState(false);
  const current = TOPICS.find((topic) => topic.key === active) ?? TOPICS[0];

  return (
    <>
      <div role="group" aria-label="مجالات المجتمع البيئي" className="mt-[26px] flex flex-wrap gap-2.5">
        {TOPICS.map((topic) => (
          <button
            key={topic.key}
            type="button"
            aria-pressed={topic.key === active}
            className={styles.communityChip}
            onClick={() => {
              setInteracted(true);
              setActive(topic.key);
            }}
          >
            {topic.label}
          </button>
        ))}
      </div>
      <div aria-live="polite" className={styles.communityPreview}>
        <span className="text-sm text-[#a5d2ba]">مساحة قيد التطوير</span>
        {/* Keyed so each change replays the entrance animation. */}
        <p
          key={current.key}
          className={`mt-1 text-base leading-[1.9] text-[#e0f1e8] ${interacted ? styles.previewEnter : ''}`}
        >
          {current.preview}
        </p>
      </div>
    </>
  );
}
