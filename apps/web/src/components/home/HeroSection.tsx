import Link from 'next/link';
import Image from 'next/image';
import '@/src/styles/animations.css';

export default function HeroSection() {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{
        minHeight: '100dvh',
        background: 'var(--stone-100)',
      }}>

      <div className="relative z-10 text-center flex flex-col items-center pt-24 pb-16">
        <Image
          src="/images/logo.png"
          alt="CAPI — caminho entre quem explora e quem opera"
          width={260}
          height={234}
          priority
          className="fade-up animate"
          style={{ '--fade-delay': '0.2s' } as React.CSSProperties}
        />

        <p className="fade-up animate mt-2 text-xs tracking-[0.2em] uppercase"
          style={{ color: 'var(--stone-500)', '--fade-delay': '0.6s' } as React.CSSProperties}>
          Caminho entre quem explora e quem opera
        </p>

        <Link href="/destinos"
          className="fade-up animate btn-tactile inline-block mt-8 px-10 py-3.5 font-semibold text-sm tracking-wider uppercase rounded-full no-underline"
          style={{
            background: 'var(--ochre)',
            color: 'white',
            '--fade-delay': '1s',
          } as React.CSSProperties}>
          Explorar destinos
        </Link>
      </div>
    </section>
  );
}
