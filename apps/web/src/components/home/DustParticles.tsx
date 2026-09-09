'use client';

import '@/src/styles/animations.css';

const particles = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${8 + Math.random() * 84}%`,
  top: `${10 + Math.random() * 80}%`,
  size: 2 + Math.random() * 3,
  duration: 3 + Math.random() * 4,
  delay: Math.random() * 5,
  dx: -30 + Math.random() * 60,
  dy: -(20 + Math.random() * 40),
  opacity: 0.3 + Math.random() * 0.4,
}));

export default function DustParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]" aria-hidden="true">
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
