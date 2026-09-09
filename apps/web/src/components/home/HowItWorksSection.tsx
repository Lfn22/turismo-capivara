'use client';

import { useEffect, useRef } from 'react';

const steps = [
  {
    title: 'Escolha seu destino',
    desc: 'Explore destinos com roteiros e guias verificados.',
    // Petroglyph: mountain/landscape
    path: 'M5 35 L15 10 L25 28 L35 5 L45 25 L55 15 L65 35',
    pathLength: 180,
  },
  {
    title: 'Encontre um guia local',
    desc: 'Compare guias, veja qualificações e escolha o ideal.',
    // Petroglyph: person figure
    path: 'M35 8 A7 7 0 1 1 35 22 A7 7 0 1 1 35 8 M35 22 L35 55 M35 32 L15 45 M35 32 L55 45 M35 55 L20 75 M35 55 L50 75',
    pathLength: 220,
  },
  {
    title: 'Reserve com PIX',
    desc: 'Pagamento instantâneo, confirmação imediata.',
    // Petroglyph: QR/payment symbol
    path: 'M10 10 L10 30 L30 30 L30 10 Z M40 10 L40 30 L60 30 L60 10 Z M10 40 L10 60 L30 60 L30 40 Z M40 40 L50 50 L60 40 M50 50 L50 65 L40 60 M50 65 L60 60',
    pathLength: 340,
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            section.querySelectorAll('.draw-stroke').forEach((el) => {
              el.classList.add('animate');
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-16 md:py-24 px-5 md:px-12 relative stone-card"
      style={{ background: 'var(--stone-100)' }}>
      <div className="max-w-[900px] mx-auto">
        <div className="reveal text-center mb-12">
          <p className="petro-decoration text-xs font-semibold tracking-[0.25em] uppercase mb-3"
            style={{ color: 'var(--ochre)' }}>
            Como funciona
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight"
            style={{ color: 'var(--stone-800)' }}>
            Simples como deve ser
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {steps.map((step, i) => (
            <div key={i} className={`reveal flex flex-col items-center text-center`}
              style={{ transitionDelay: `${0.15 * (i + 1)}s` }}>
              {/* Petroglyph icon with draw-in animation */}
              <div className="w-[80px] h-[80px] rounded-full flex items-center justify-center mb-5"
                style={{
                  background: 'var(--ochre-bg)',
                  border: '1px solid rgba(196,133,42,0.15)',
                }}>
                <svg viewBox="0 0 70 80" width="44" height="50" aria-hidden="true">
                  <path
                    className="draw-stroke"
                    d={step.path}
                    strokeWidth="3"
                    style={{
                      '--path-length': step.pathLength,
                      '--draw-duration': '1.2s',
                      '--draw-delay': `${0.3 + i * 0.3}s`,
                    } as React.CSSProperties}
                  />
                </svg>
              </div>

              {/* Step number */}
              <span className="text-xs font-bold tracking-[0.15em] uppercase mb-2"
                style={{ color: 'var(--ochre-dark)' }}>
                Passo {i + 1}
              </span>

              <h3 className="font-[family-name:var(--font-display)] font-bold text-lg mb-2"
                style={{ color: 'var(--stone-800)' }}>
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--stone-500)' }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
