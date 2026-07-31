import Link from 'next/link';
import HeroLogoAnimation from './HeroLogoAnimation';
import '@/src/styles/animations.css';
import '@/src/styles/rupestre.css';

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden stone-texture vignette"
      style={{
        height: '100dvh',
        minHeight: '700px',
        background: 'linear-gradient(175deg, #1a1714 0%, var(--stone-900) 30%, var(--stone-800) 70%, #2a2520 100%)',
      }}>

      <div className="relative z-10 text-center flex flex-col items-center">
        <HeroLogoAnimation />

        <h1 className="fade-up animate font-[family-name:var(--font-display)] font-black tracking-[0.15em]"
          style={{
            fontSize: 'clamp(3rem, 6vw, 5rem)',
            color: 'var(--stone-100)',
            '--fade-delay': '2.1s',
          } as React.CSSProperties}>
          CAPI
        </h1>

        <p className="fade-up animate text-sm md:text-base tracking-[0.3em] uppercase mt-3"
          style={{
            color: 'var(--ochre-light)',
            '--fade-delay': '2.4s',
          } as React.CSSProperties}>
          caminho entre quem explora e quem opera
        </p>

        <Link href="/destinos"
          className="fade-up animate inline-block mt-10 px-10 py-3.5 font-semibold text-sm tracking-wider uppercase rounded-md no-underline transition-all duration-300"
          style={{
            background: 'var(--ochre)',
            color: 'white',
            '--fade-delay': '2.7s',
          } as React.CSSProperties}>
          Explorar destinos
        </Link>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-[10px] tracking-[0.2em] uppercase"
          style={{ color: 'var(--stone-600)' }}>
          scroll
        </span>
        <div className="w-5 h-5 border-r-[1.5px] border-b-[1.5px]"
          style={{
            borderColor: 'var(--stone-600)',
            animation: 'scrollBounce 2.5s ease infinite',
            transform: 'rotate(45deg)',
          }} />
      </div>
    </section>
  );
}
