export default function GuidesSection() {
  return (
    <section className="py-16 md:py-24 px-5 md:px-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, var(--stone-800) 0%, var(--stone-900) 100%)',
      }}>
      <div className="max-w-[1200px] mx-auto relative z-10">
        <div className="reveal">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-3"
            style={{ color: 'var(--ochre-light)' }}>
            Guias locais
          </p>
          <h2 className="font-[family-name:var(--font-display)] font-bold text-2xl md:text-[2.5rem] leading-tight mb-4"
            style={{ color: 'var(--stone-100)' }}>
            Quem conhece <em style={{ color: 'var(--ochre-light)', fontStyle: 'italic' }}>de verdade</em>
          </h2>
          <p className="text-lg leading-relaxed max-w-[560px]"
            style={{ color: 'var(--stone-400)' }}>
            Guias nascidos e criados na regiao. Cada trilha tem uma historia, cada pedra tem um nome.
          </p>
        </div>
      </div>
    </section>
  );
}
