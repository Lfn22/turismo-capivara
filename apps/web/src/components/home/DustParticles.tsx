'use client';

import '@/src/styles/animations.css';

/**
 * Partículas de poeira bem sutis, só no hero da home.
 * Valores determinísticos (sem Math.random) para o HTML do servidor e do cliente baterem.
 * Some com prefers-reduced-motion.
 */
const particles = Array.from({ length: 8 }, (_, i) => {
  // pseudo-aleatório arredondado a 2 casas: estável entre servidor e navegador
  const r = (n: number) => Math.round((((Math.sin((i + 1) * 9301 + n * 49297) + 1) / 2) % 1) * 100) / 100;
  return {
    id: i,
    left: `${8 + r(1) * 84}%`,
    top: `${10 + r(2) * 70}%`,
    size: 2 + r(3) * 2,
    duration: 4 + r(4) * 4,
    delay: r(5) * 5,
    dx: -24 + r(6) * 48,
    dy: -(16 + r(7) * 32),
    opacity: 0.12 + r(8) * 0.14,
  };
});

export default function DustParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden" style={{ zIndex: -1 }} aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="dust-particle"
          style={{
            left: p.left,
            top: p.top,
            '--dust-size': `${p.size}px`,
            '--dust-duration': `${p.duration}s`,
            '--dust-delay': `${p.delay}s`,
            '--dx': `${p.dx}px`,
            '--dy': `${p.dy}px`,
            '--dust-opacity': p.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
