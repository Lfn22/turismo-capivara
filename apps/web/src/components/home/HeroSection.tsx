import Link from 'next/link';
import CapiLogoAnimated from './CapiLogoAnimated';
import DustParticles from './DustParticles';
import '@/src/styles/animations.css';
import '@/src/styles/rupestre.css';

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        minHeight: 'clamp(320px, 55vh, 640px)',
        background: 'linear-gradient(135deg, var(--stone-100) 0%, var(--stone-200) 40%, rgba(196,133,42,0.06) 70%, var(--stone-200) 100%)',
      }}>

      {/* Stone texture overlay */}
      <div className="stone-texture absolute inset-0 z-[1]" aria-hidden="true" />

      {/* Floating dust particles */}
      <DustParticles />

      {/* Subtle radial glow behind logo */}
      <div className="absolute z-[3] pointer-events-none" aria-hidden="true"
        style={{
          width: 'clamp(280px, 40vw, 480px)',
          height: 'clamp(280px, 40vw, 480px)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -55%)',
          background: 'radial-gradient(circle, var(--ochre-glow-strong) 0%, var(--ochre-glow) 40%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      <div className="relative z-10 text-center flex flex-col items-center px-5 py-12">
        <div className="fade-up animate" style={{ '--fade-delay': '0.1s' } as React.CSSProperties}>
          <CapiLogoAnimated maxWidth="clamp(200px, 30vw, 340px)" />
        </div>

        <Link href="/destinos"
          className="fade-up animate btn btn-primary btn-lg mt-6"
          style={{
            '--fade-delay': '2.4s',
          } as React.CSSProperties}>
          Encontrar roteiro
        </Link>
      </div>
    </section>
  );
}
