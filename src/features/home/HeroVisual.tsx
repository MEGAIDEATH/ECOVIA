'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { LandingIcon, type LandingIconName } from './icons';
import styles from './landing.module.css';

interface StakeholderCard {
  label: string;
  icon: LandingIconName;
  position: string;
}

const CARDS: readonly StakeholderCard[] = [
  { label: 'الأخصائي البيئي', icon: 'person', position: styles.one },
  { label: 'المنشآت', icon: 'building', position: styles.two },
  { label: 'المجتمع', icon: 'community', position: styles.three },
];

/** Drag bounds (px), keyboard step and the move distance that counts as a drag. */
const LIMIT_X = 43;
const LIMIT_Y = 28;
const KEY_STEP = 12;
const DRAG_THRESHOLD = 5;

interface Offset {
  x: number;
  y: number;
}

interface DragState {
  index: number;
  pointerId: number;
  startX: number;
  startY: number;
  base: Offset;
  moved: boolean;
}

const clamp = (value: number, limit: number) => Math.min(limit, Math.max(-limit, value));
const ORIGIN: Offset = { x: 0, y: 0 };

/**
 * Hero illustration with three stakeholder cards that can be gently dragged
 * (bounded), tapped to highlight, nudged with the arrow keys and reset with
 * Escape — the original landing interaction, driven by React state.
 */
export function HeroVisual() {
  const [offsets, setOffsets] = useState<Offset[]>(() => CARDS.map(() => ORIGIN));
  const [pressed, setPressed] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  /** Swallows the click that follows a drag release. */
  const justDraggedRef = useRef(false);

  const setOffset = (index: number, next: Offset) =>
    setOffsets((previous) =>
      previous.map((offset, i) => (i === index ? { x: clamp(next.x, LIMIT_X), y: clamp(next.y, LIMIT_Y) } : offset)),
    );

  const onPointerDown = (index: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      base: offsets[index],
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(index);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) drag.moved = true;
    if (drag.moved) setOffset(drag.index, { x: drag.base.x + dx, y: drag.base.y + dy });
  };

  const onPointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setDragging(null);
    setPressed(drag.index);
    if (drag.moved) {
      justDraggedRef.current = true;
      window.setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
    }
    dragRef.current = null;
  };

  const onPointerCancel = () => {
    dragRef.current = null;
    setDragging(null);
  };

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const { x, y } = offsets[index];
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown': {
        event.preventDefault();
        const dx = event.key === 'ArrowLeft' ? -KEY_STEP : event.key === 'ArrowRight' ? KEY_STEP : 0;
        const dy = event.key === 'ArrowUp' ? -KEY_STEP : event.key === 'ArrowDown' ? KEY_STEP : 0;
        setOffset(index, { x: x + dx, y: y + dy });
        setPressed(index);
        break;
      }
      case 'Escape':
        setOffset(index, ORIGIN);
        break;
    }
  };

  return (
    <div className="relative grid min-h-[370px] place-items-center xs:min-h-[440px] md:min-h-[460px] lg:min-h-[560px]">
      <div className={styles.visualPanel}>
        <div className={styles.halo} />
        <div className={`${styles.halo} ${styles.halo2}`} />
        <div className={`${styles.halo} ${styles.halo3}`} />
        <div className={styles.ecoOrb} aria-hidden="true">
          <svg className={styles.orbBranch} viewBox="0 0 290 250" xmlns="http://www.w3.org/2000/svg">
            <path d="M115 245 C58 176 47 125 92 58 C137 82 171 128 154 185 C148 210 135 229 115 245Z" />
            <path d="M135 247 C145 180 178 125 265 85 C275 168 226 223 135 247Z" />
            <path d="M73 186 C30 166 21 103 28 30 C94 52 130 108 109 172Z" />
          </svg>
        </div>
        {CARDS.map((card, index) => (
          <button
            key={card.label}
            type="button"
            aria-label={`${card.label} — اسحب البطاقة أو اضغط عليها`}
            aria-pressed={pressed === index}
            data-dragging={dragging === index ? 'true' : undefined}
            className={`${styles.orbitLabel} ${card.position}`}
            style={{ transform: `translate3d(${offsets[index].x}px, ${offsets[index].y}px, 0)` }}
            onPointerDown={onPointerDown(index)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            onClick={() => {
              if (!justDraggedRef.current) setPressed(index);
            }}
            onKeyDown={onKeyDown(index)}
          >
            <LandingIcon name={card.icon} />
            <span>{card.label}</span>
          </button>
        ))}
      </div>
      <p className={styles.playHint}>يمكنك تحريك البطاقات أو الضغط عليها</p>
    </div>
  );
}
