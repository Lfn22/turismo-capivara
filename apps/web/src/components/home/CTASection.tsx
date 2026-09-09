import Link from 'next/link';
import '@/src/styles/animations.css';

export default function CTASection() {
  return (
    <section className="text-center py-16 md:py-24 px-5 md:px-12"
      style={{ background: 'linear-gradient(180deg, var(--stone-50) 0%, var(--ochre-bg) 100%)' }}>
      <div className="reveal">
        <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-3"
          style={{ color: 'var(--ochre)' }}>
          Comece agora
        </p>
        <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight max-w-[550px] mx-auto mb-4"
          style={{ color: 'var(--stone-800)' }}>
          Sua próxima <em style={{ color: 'var(--ochre)', fontStyle: 'italic' }}>aventura</em>{' '}
          começa aqui
        </h2>
        <p className="text-base md:text-lg max-w-[480px] mx-auto"
          style={{ color: 'var(--stone-500)' }}>
          Encontre guias locais, escolha seu roteiro e reserve com segurança.
        </p>
        <Link href="/destinos"
          className="btn btn-outline btn-lg mt-8">
          Explorar destinos
        </Link>
      </div>
    </section>
  );
}
