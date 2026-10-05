'use client';

import { useEffect } from 'react';

/**
 * Revela seções ao rolar (uma vez). `.home-reveal` é a versão v2: fade + 16px, desligada com
 * prefers-reduced-motion. `.reveal*` (v1) continuam observadas para compatibilidade.
 */
export default function ScrollRevealProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );

    document
      .querySelectorAll('.reveal, .reveal-left, .reveal-right, .home-reveal')
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .home-reveal {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity .6s cubic-bezier(.16, 1, .3, 1), transform .6s cubic-bezier(.16, 1, .3, 1);
        }
        .home-reveal.visible { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) {
          .home-reveal { opacity: 1; transform: none; transition: none; }
        }
      `}</style>
      {children}
    </>
  );
}
