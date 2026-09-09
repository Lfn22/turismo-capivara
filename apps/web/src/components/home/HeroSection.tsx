import Link from 'next/link';
import CapiLogoAnimated from './CapiLogoAnimated';
import DustParticles from './DustParticles';
import '@/src/styles/animations.css';
import '@/src/styles/rupestre.css';

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(180deg, var(--stone-100) 0%, var(--stone-200) 100%)',
      }}>

      {/* Stone texture overlay */}
      <div className="stone-texture absolute inset-0 z-[1]" aria-hidden="true" />

      {/* Floating dust particles */}
      <DustParticles />

      {/* Subtle radial glow behind logo */}
      <div className="absolute z-[3] pointer-events-none" aria-hidden="true"
        style={{
          width: 'clamp(320px, 50vw, 600px)',
          height: 'clamp(320px, 50vw, 600px)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -55%)',
          background: 'radial-gradient(circle, var(--ochre-glow) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      <div className="relative z-10 text-center flex flex-col items-center pt-24 pb-16 px-5">
        <div className="fade-up animate" style={{ '--fade-delay': '0.1s' } as React.CSSProperties}>
          <CapiLogoAnimated maxWidth="clamp(240px, 38vw, 420px)" />
        </div>

        <p className="fade-up animate mt-4 text-xs md:text-sm tracking-[0.2em] uppercase"
          style={{ color: 'var(--stone-500)', '--fade-delay': '2.2s' } as React.CSSProperties}>
          Caminho entre quem explora e quem opera
        </p>

        <Link href="/destinos"
          className="fade-up animate btn-tactile inline-block mt-8 px-10 py-3.5 font-semibold text-sm tracking-wider uppercase rounded-full no-underline"
          style={{
            background: 'var(--ochre)',
            color: 'white',
            '--fade-delay': '2.6s',
          } as React.CSSProperties}>
          Explorar destinos
        </Link>

        {/* Scroll indicator */}
        <div className="fade-up animate absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ '--fade-delay': '3.2s' } as React.CSSProperties}>
          <div className="scrollBounce" style={{
            width: '1.5px',
            height: '32px',
            background: 'linear-gradient(to bottom, var(--ochre), transparent)',
            opacity: 0.4,
          }} />
        </div>
      </div>
    </section>
  );
}
