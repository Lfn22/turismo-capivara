import { ArrowRight, Building2 } from 'lucide-react';
import { Button } from '@/src/components/ui/capi';
import '@/src/styles/rupestre.css';

/** CTA final da home, para guias e operadoras, em `surface-brand`. */
export default function CTASection() {
  return (
    <section
      className="capi-section relative overflow-hidden bg-surface-brand text-on-brand"
      aria-labelledby="home-cta-title"
    >
      {/* Grão rupestre: no máximo 6% de opacidade, só em surface-brand */}
      <div className="stone-texture absolute inset-0 opacity-15" aria-hidden="true" />

      <div className="capi-container relative text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-on-brand-secondary)', marginBottom: 'var(--space-3)' }}>
          Para guias e operadoras
        </p>
        <h2
          id="home-cta-title"
          className="font-[family-name:var(--font-display)] text-[clamp(28px,4vw,44px)] font-bold leading-tight"
          style={{ color: 'var(--text-on-brand)', maxWidth: 620, margin: '0 auto var(--space-4)' }}
        >
          Leve seus roteiros a quem quer explorar
        </h2>
        <p className="text-base md:text-lg" style={{ color: 'var(--text-on-brand-secondary)', maxWidth: 480, margin: '0 auto var(--space-8)' }}>
          Publique seus roteiros, receba reservas com PIX e organize sua agenda em um só lugar.
        </p>
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button href="/cadastro/guia" size="lg" iconRight={ArrowRight}>
            Cadastrar como guia
          </Button>
          <Button href="/onboarding" variant="secondary" size="lg" iconLeft={Building2}>
            Cadastrar operadora
          </Button>
        </div>
      </div>
    </section>
  );
}
