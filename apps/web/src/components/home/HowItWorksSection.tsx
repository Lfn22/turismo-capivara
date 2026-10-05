import { MapPinned, QrCode, UserCheck, type LucideIcon } from 'lucide-react';

const steps: Array<{ title: string; desc: string; icon: LucideIcon }> = [
  {
    title: 'Escolha seu destino',
    desc: 'Explore destinos com roteiros e guias verificados.',
    icon: MapPinned,
  },
  {
    title: 'Encontre um guia local',
    desc: 'Compare guias, veja qualificações e escolha o ideal.',
    icon: UserCheck,
  },
  {
    title: 'Reserve com PIX',
    desc: 'Pagamento instantâneo, confirmação imediata.',
    icon: QrCode,
  },
];

/** "Como funciona" em 3 passos, em `bg-subtle`. */
export default function HowItWorksSection() {
  return (
    <section className="capi-section bg-subtle" aria-labelledby="home-como-funciona-title">
      <div className="capi-container">
        <div className="text-center" style={{ maxWidth: 680, margin: '0 auto var(--space-10)' }}>
          <p style={{ marginBottom: 'var(--space-2)' }} className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-primary">Como funciona</p>
          <h2
            id="home-como-funciona-title"
            className="font-[family-name:var(--font-display)] text-[clamp(28px,4vw,44px)] font-bold leading-tight text-fg"
          >
            Simples como deve ser
          </h2>
        </div>

        <ol className="grid list-none grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-[var(--radius-lg)] border border-line bg-surface md:flex-col md:gap-3"
                style={{ padding: 'var(--space-5)' }}
              >
                <span
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-fg-primary"
                  aria-hidden="true"
                >
                  <Icon size={24} strokeWidth={1.75} />
                </span>
                <div>
                  <p style={{ marginBottom: 'var(--space-1)' }} className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-secondary">
                    Passo {i + 1}
                  </p>
                  <h3 style={{ marginBottom: 'var(--space-1)' }} className="text-[17px] font-semibold leading-snug text-fg">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-fg-secondary">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
