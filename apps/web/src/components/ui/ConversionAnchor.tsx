'use client';

import { useState } from 'react';

export interface ConversionAnchorProps {
  destinationName: string;
  guideCount: number;
}

export default function ConversionAnchor({
  destinationName,
  guideCount,
}: ConversionAnchorProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const hasGuides = guideCount > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    // TODO: conectar ao endpoint de waitlist
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <>
      <style>{`
        .conv-anchor {
          background: var(--stone-100);
          border-top: 1px solid var(--stone-200);
          border-bottom: 1px solid var(--stone-200);
          padding: clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 5vw, 3.5rem);
        }

        .conv-anchor__inner {
          max-width: 1100px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: clamp(1.5rem, 4vw, 3rem);
          flex-wrap: wrap;
        }

        /* ── Lado esquerdo ────────────────────────────────────── */
        .conv-anchor__text {
          flex: 1 1 280px;
        }

        .conv-anchor__eyebrow {
          font-size: 0.66rem;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--ochre);
          margin-bottom: 0.6rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .conv-anchor__eyebrow::before {
          content: '';
          display: block;
          width: 20px;
          height: 1px;
          background: var(--ochre);
          flex-shrink: 0;
        }

        .conv-anchor__heading {
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.35rem, 3vw, 2rem);
          font-weight: 700;
          letter-spacing: -0.025em;
          color: var(--stone-900);
          line-height: 1.15;
        }

        .conv-anchor__heading em {
          font-style: normal;
          color: var(--ochre-dark);
        }

        .conv-anchor__sub {
          font-size: clamp(0.85rem, 1.4vw, 0.95rem);
          color: var(--stone-500);
          margin-top: 0.5rem;
          line-height: 1.6;
        }

        /* ── Lado direito — CTA ou form ───────────────────────── */
        .conv-anchor__action {
          flex: 0 0 auto;
        }

        /* Botão padrão */
        .conv-anchor__btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--stone-900);
          background: var(--ochre);
          text-decoration: none;
          padding: 0.85rem 1.75rem;
          border-radius: 2px;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
          white-space: nowrap;
        }

        .conv-anchor__btn:hover {
          background: var(--ochre-dark);
          transform: translateY(-1px);
        }

        /* Contador de guias no botão */
        .conv-anchor__btn-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 5px;
          background: rgba(0, 0, 0, 0.18);
          border-radius: 2px;
          font-size: 0.68rem;
          font-weight: 700;
          line-height: 1;
        }

        /* Form de waitlist */
        .conv-anchor__form {
          display: flex;
          align-items: stretch;
          gap: 0;
          border: 1px solid var(--stone-300);
          border-radius: 2px;
          overflow: hidden;
          background: #fff;
          min-width: clamp(240px, 38vw, 360px);
        }

        .conv-anchor__input {
          flex: 1;
          border: none;
          outline: none;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
          color: var(--stone-800);
          background: transparent;
          font-family: var(--font-body), Georgia, serif;
        }

        .conv-anchor__input::placeholder {
          color: var(--stone-400);
        }

        .conv-anchor__submit {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.75rem 1.25rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: var(--stone-900);
          color: #fff;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          white-space: nowrap;
        }

        .conv-anchor__submit:hover:not(:disabled) {
          background: var(--stone-800);
        }

        .conv-anchor__submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Estado de confirmação */
        .conv-anchor__confirmed {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.88rem;
          color: var(--stone-700);
          padding: 0.75rem 0;
        }

        .conv-anchor__confirmed-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--ochre);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #fff;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .conv-anchor__inner {
            flex-direction: column;
            align-items: flex-start;
          }

          .conv-anchor__form {
            min-width: 0;
            width: 100%;
          }

          .conv-anchor__btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="conv-anchor" id="guias-cta">
        <div className="conv-anchor__inner">

          {/* Texto */}
          <div className="conv-anchor__text">
            <p className="conv-anchor__eyebrow">
              {hasGuides ? 'Guias disponíveis' : 'Em breve'}
            </p>
            <h2 className="conv-anchor__heading">
              {hasGuides ? (
                <>Conheça os guias de <em>{destinationName}</em></>
              ) : (
                <>Guias chegando em <em>{destinationName}</em></>
              )}
            </h2>
            <p className="conv-anchor__sub">
              {hasGuides
                ? `${guideCount} ${guideCount === 1 ? 'guia certificado disponível' : 'guias certificados disponíveis'} para este destino.`
                : 'Seja o primeiro a saber quando novos guias estiverem disponíveis.'}
            </p>
          </div>

          {/* Ação */}
          <div className="conv-anchor__action">
            {hasGuides ? (
              <a href="#guias" className="conv-anchor__btn" aria-label="Ver lista de guias">
                Ver guias
                <span className="conv-anchor__btn-count" aria-hidden="true">
                  {guideCount}
                </span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  aria-hidden="true">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </a>
            ) : submitted ? (
              <div className="conv-anchor__confirmed" role="status">
                <div className="conv-anchor__confirmed-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <span>Avisaremos quando houver guias disponíveis.</span>
              </div>
            ) : (
              <form
                className="conv-anchor__form"
                onSubmit={handleSubmit}
                aria-label="Cadastro para lista de espera"
              >
                <input
                  className="conv-anchor__input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  aria-label="Seu e-mail"
                  autoComplete="email"
                />
                <button
                  type="submit"
                  className="conv-anchor__submit"
                  disabled={loading}
                  aria-label="Entrar na lista de espera"
                >
                  {loading ? 'Enviando…' : 'Me avise'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
