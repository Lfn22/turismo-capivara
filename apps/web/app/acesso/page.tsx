import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Bem-vindo | CAPI',
  description: 'Tudo que você precisa saber antes de começar a usar o CAPI.',
}

export default function AcessoPage() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }

        .acesso-page {
          min-height: 100dvh;
          background: var(--stone-50);
          padding: clamp(2rem, 8vw, 5rem) 1.5rem;
        }

        .acesso-page__inner {
          max-width: 42rem;
          margin: 0 auto;
        }

        .acesso-page__wordmark {
          font-family: var(--font-display);
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 700;
          color: var(--ochre);
          letter-spacing: 0.06em;
          margin-bottom: 0.25rem;
        }

        .acesso-page__tagline {
          font-family: var(--font-body);
          font-size: clamp(0.9rem, 2.5vw, 1rem);
          color: var(--stone-500);
          font-style: italic;
          margin-bottom: 2.5rem;
        }

        .acesso-page__section {
          margin-bottom: 2.5rem;
          padding-bottom: 2.5rem;
          border-bottom: 1px solid var(--stone-200);
        }

        .acesso-page__section:last-of-type {
          border-bottom: none;
        }

        .acesso-page__section-title {
          font-family: var(--font-display);
          font-size: clamp(1.1rem, 3vw, 1.35rem);
          font-weight: 700;
          color: var(--stone-900);
          margin-bottom: 0.75rem;
        }

        .acesso-page__body {
          font-family: var(--font-body);
          font-size: clamp(0.95rem, 2.5vw, 1rem);
          color: var(--stone-700);
          line-height: 1.65;
          margin-bottom: 0.75rem;
        }

        .acesso-page__list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .acesso-page__list li {
          font-family: var(--font-body);
          font-size: clamp(0.95rem, 2.5vw, 1rem);
          color: var(--stone-700);
          line-height: 1.55;
          padding-left: 1.25rem;
          position: relative;
        }

        .acesso-page__list li::before {
          content: '—';
          position: absolute;
          left: 0;
          color: var(--ochre);
          font-weight: 700;
        }

        .acesso-page__flow {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .acesso-page__step {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .acesso-page__step-num {
          flex-shrink: 0;
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 50%;
          background: var(--ochre);
          color: #fff;
          font-family: var(--font-display);
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 0.1rem;
        }

        .acesso-page__step-text {
          font-family: var(--font-body);
          font-size: clamp(0.95rem, 2.5vw, 1rem);
          color: var(--stone-700);
          line-height: 1.55;
          padding-top: 0.2rem;
        }

        .acesso-page__step-connector {
          width: 1px;
          height: 1.25rem;
          background: var(--stone-300);
          margin-left: calc(1.75rem / 2);
        }

        .acesso-page__cta {
          display: inline-block;
          margin-top: 1.25rem;
          padding: 0.75rem 1.5rem;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          background: var(--ochre);
          border-radius: 3px;
          text-decoration: none;
          transition: background 0.2s;
        }

        .acesso-page__cta:hover {
          background: var(--ochre-dark);
        }

        .acesso-page__contact-email {
          font-family: var(--font-body);
          font-size: clamp(0.95rem, 2.5vw, 1rem);
          color: var(--ochre);
          font-weight: 600;
          text-decoration: none;
        }

        .acesso-page__contact-email:hover {
          text-decoration: underline;
        }

        .acesso-page__badge {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          background: var(--stone-100);
          border: 1px solid var(--stone-300);
          border-radius: 2px;
          font-family: var(--font-body);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--stone-600);
          margin-bottom: 1rem;
        }
      `}</style>

      <main className="acesso-page">
        <div className="acesso-page__inner">

          {/* Seção 1 — Boas-vindas */}
          <header className="acesso-page__section">
            <span className="acesso-page__badge">Early Adopter</span>
            <h1 className="acesso-page__wordmark">CAPI</h1>
            <p className="acesso-page__tagline">caminho entre quem explora e quem opera</p>
            <p className="acesso-page__body">
              Obrigado por ser um dos primeiros a usar o CAPI. Você está ajudando a conectar turistas a guias certificados de Serra da Capivara — e sua experiência vai moldar o produto.
            </p>
            <p className="acesso-page__body">
              Antes de começar, leia esta página. Ela descreve como o CAPI funciona, o que ainda está em desenvolvimento e como nos contatar caso precise de ajuda.
            </p>
          </header>

          {/* Seção 2 — Como funciona */}
          <section className="acesso-page__section">
            <h2 className="acesso-page__section-title">Como funciona</h2>
            <p className="acesso-page__body">O fluxo completo de uma reserva:</p>
            <div className="acesso-page__flow">
              <div className="acesso-page__step">
                <span className="acesso-page__step-num">1</span>
                <span className="acesso-page__step-text">
                  <strong>Escolha o roteiro</strong> — navegue pelos roteiros disponíveis e selecione o guia com o horário que preferir.
                </span>
              </div>
              <div className="acesso-page__step-connector" />
              <div className="acesso-page__step">
                <span className="acesso-page__step-num">2</span>
                <span className="acesso-page__step-text">
                  <strong>Reserve com PIX</strong> — informe seus dados e efetue o pagamento via QR Code PIX. Nenhum cadastro necessário.
                </span>
              </div>
              <div className="acesso-page__step-connector" />
              <div className="acesso-page__step">
                <span className="acesso-page__step-num">3</span>
                <span className="acesso-page__step-text">
                  <strong>Aguarde a confirmação</strong> — após o PIX ser processado (normalmente em minutos), você recebe um email de confirmação com os detalhes da reserva.
                </span>
              </div>
              <div className="acesso-page__step-connector" />
              <div className="acesso-page__step">
                <span className="acesso-page__step-num">4</span>
                <span className="acesso-page__step-text">
                  <strong>Encontre seu guia</strong> — no dia combinado, apresente o email de confirmação ao guia. Aproveite o roteiro.
                </span>
              </div>
            </div>
          </section>

          {/* Seção 3 — Limitações conhecidas */}
          <section className="acesso-page__section">
            <h2 className="acesso-page__section-title">Limitações conhecidas (fase beta)</h2>
            <p className="acesso-page__body">
              O CAPI está em fase beta. Algumas funcionalidades ainda não estão disponíveis:
            </p>
            <ul className="acesso-page__list">
              <li>Pagamento somente via PIX — cartão de crédito estará disponível em breve</li>
              <li>Cancelamento deve ser solicitado por email ao suporte — autoatendimento está em desenvolvimento</li>
              <li>Reservas ficam com status <strong>pendente</strong> por até 30 minutos enquanto aguardam a confirmação do PIX</li>
              <li>Em caso de falha no pagamento, a reserva expira automaticamente — basta criar uma nova reserva e tentar novamente</li>
              <li>Eventuais instabilidades são esperadas — comunicaremos qualquer interrupção por email</li>
            </ul>
          </section>

          {/* Seção 4 — Cancelamento e reembolso */}
          <section className="acesso-page__section">
            <h2 className="acesso-page__section-title">Cancelamento e reembolso</h2>
            <ul className="acesso-page__list">
              <li>
                <strong>Cancelamento com mais de 48h de antecedência:</strong> reembolso integral em até 5 dias úteis
              </li>
              <li>
                <strong>Cancelamento com menos de 48h:</strong> sem reembolso, exceto em caso de falha técnica comprovada da plataforma
              </li>
              <li>
                <strong>Falha técnica da plataforma:</strong> reembolso integral independente do prazo — basta descrever o ocorrido por email
              </li>
              <li>
                Reembolsos são processados via PIX para o CPF informado na reserva
              </li>
            </ul>
            <p className="acesso-page__body" style={{ marginTop: '0.75rem' }}>
              Para solicitar cancelamento, envie email ao suporte com o número da reserva no assunto.
            </p>
          </section>

          {/* Seção 5 — Contato / Suporte */}
          <section className="acesso-page__section">
            <h2 className="acesso-page__section-title">Suporte</h2>
            <p className="acesso-page__body">
              Email:{' '}
              <a href="mailto:suporte@capi.turismo" className="acesso-page__contact-email">
                suporte@capi.turismo
              </a>
            </p>
            <p className="acesso-page__body">
              Tempo de resposta: até 24 horas em dias úteis.
            </p>
            <p className="acesso-page__body">
              Para cancelamentos urgentes, inclua o número da reserva no assunto do email.
            </p>
            <Link href="/destinos" className="acesso-page__cta">
              Explorar roteiros
            </Link>
          </section>

        </div>
      </main>
    </>
  )
}
