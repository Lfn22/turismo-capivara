'use client';

import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 120, suffix: '+', label: 'Roteiros' },
  { value: 45, suffix: '', label: 'Guias Locais' },
  { value: 2800, suffix: '+', label: 'Aventureiros' },
];

function AnimatedCounter({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;
    const duration = 1800;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      // Ease-out cubic
      const t = step / steps;
      const eased = 1 - Math.pow(1 - t, 3);
      current = Math.round(eased * target);
      setCount(current);

      if (step >= steps) {
        setCount(target);
        clearInterval(timer);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [active, target]);

  return (
    <span>
      {count.toLocaleString('pt-BR')}{suffix}
    </span>
  );
}

export default function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative stone-card overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, var(--stone-800), var(--stone-900))',
        borderTop: '1px solid rgba(196,133,42,0.1)',
        borderBottom: '1px solid rgba(196,133,42,0.1)',
      }}>
      <div className="max-w-[900px] mx-auto py-8 px-5 grid grid-cols-3 gap-4 text-center">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-4xl"
              style={{ color: 'var(--ochre-light)' }}>
              <AnimatedCounter target={stat.value} suffix={stat.suffix} active={active} />
            </span>
            <span className="text-[10px] md:text-xs font-semibold tracking-[0.15em] uppercase"
              style={{ color: 'var(--stone-400)' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
