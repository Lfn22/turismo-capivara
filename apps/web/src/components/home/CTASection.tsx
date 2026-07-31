import Link from 'next/link';

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
          Sua proxima aventura comeca aqui
        </h2>
        <p className="text-base md:text-lg max-w-[480px] mx-auto"
          style={{ color: 'var(--stone-500)' }}>
          Encontre guias locais, escolha seu roteiro e reserve com seguranca.
        </p>
        <Link href="/destinos"
          className="inline-block mt-8 px-12 py-4 font-semibold text-base rounded-md no-underline transition-all duration-300"
          style={{ background: 'var(--ochre)', color: 'white' }}>
          Explorar destinos
        </Link>
      </div>
    </section>
  );
}
