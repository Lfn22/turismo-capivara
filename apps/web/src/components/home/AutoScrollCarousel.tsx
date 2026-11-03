'use client';

import { useEffect, useRef } from 'react';

interface Props {
  cardWidth: number;
  gap: number;
  interval?: number;
  ariaLabel: string;
  children: React.ReactNode;
}

export default function AutoScrollCarousel({ cardWidth, gap, interval = 3500, ariaLabel, children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const step = cardWidth + gap;
    const timer = setInterval(() => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: step, behavior: 'smooth' });
      }
    }, interval);

    return () => clearInterval(timer);
  }, [cardWidth, gap, interval]);

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto pb-4 px-2"
      role="region"
      aria-label={ariaLabel}
      style={{
        gap: `${gap}px`,
        scrollSnapType: 'x mandatory',
        WebkitOverflowScrolling: 'touch',
      }}>
      {children}
    </div>
  );
}
