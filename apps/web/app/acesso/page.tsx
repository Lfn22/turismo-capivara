'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AcessoPage() {
  const [slug, setSlug] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = slug.trim().toLowerCase()
    if (!value) {
      setError('Informe o identificador da sua conta.')
      return
    }
    router.push(`/${value}/login`)
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .acesso {
          min-height: 100dvh;
          background: var(--stone-50);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: clamp(2rem, 8vw, 5rem) 1.5rem;
        }

        .acesso__card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 4px;
          padding: clamp(2rem, 6vw, 3rem) clamp(1.5rem, 5vw, 2.5rem);
        }

        .acesso__wordmark {
          font-family: var(--font-display);
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--ochre);
          letter-spacing: 0.04em;
          margin-bottom: 1.75rem;
        }

        .acesso__title {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--stone-900, #1c1917);
          margin-bottom: 0.4rem;
        }

        .acesso__sub {
          font-family: var(--font-body);
          font-size: 0.9rem;
          color: var(--stone-500, #78716c);
          margin-bottom: 2rem;
          line-height: 1.5;
        }

        .acesso__label {
          display: block;
          font-family: var(--font-body);
          font-size: 0.8rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--stone-600, #57534e);
          margin-bottom: 0.4rem;
        }

        .acesso__input {
          display: block;
          width: 100%;
          font-family: var(--font-body);
          font-size: 1rem;
          color: var(--stone-900, #1c1917);
          background: var(--stone-50, #fafaf9);
          border: 1px solid var(--stone-300, #d6d3d1);
          border-radius: 3px;
          padding: 0.75rem 1rem;
          outline: none;
          transition: border-color 0.15s;
        }

        .acesso__input:focus {
          border-color: var(--ochre);
        }

        .acesso__hint {
          font-family: var(--font-body);
          font-size: 0.78rem;
          color: var(--stone-400, #a8a29e);
          margin-top: 0.35rem;
        }

        .acesso__error {
          font-family: var(--font-body);
          font-size: 0.82rem;
          color: #b91c1c;
          margin-top: 0.35rem;
        }

        .acesso__btn {
          display: block;
          width: 100%;
          margin-top: 1.5rem;
          padding: 0.85rem 1.5rem;
          font-family: var(--font-body);
          font-size: 1rem;
          font-weight: 600;
          color: #fff;
          background: var(--ochre);
          border: none;
          border-radius: 3px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .acesso__btn:hover {
          background: var(--ochre-dark, #a07010);
        }

        .acesso__divider {
          margin: 1.75rem 0 1.25rem;
          border: none;
          border-top: 1px solid var(--stone-200, #e7e5e4);
        }

        .acesso__signup {
          font-family: var(--font-body);
          font-size: 0.88rem;
          color: var(--stone-500, #78716c);
          text-align: center;
        }

        .acesso__signup a {
          color: var(--ochre);
          font-weight: 600;
          text-decoration: none;
        }

        .acesso__signup a:hover {
          text-decoration: underline;
        }
      `}</style>

      <main className="acesso">
        <div className="acesso__card">
          <p className="acesso__wordmark">CAPI</p>

          <h1 className="acesso__title">Acessar painel</h1>
          <p className="acesso__sub">
            Digite o identificador da sua conta para continuar.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="slug" className="acesso__label">Identificador da conta</label>
            <input
              id="slug"
              className="acesso__input"
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setError('') }}
              placeholder="ex: serra-viva"
              autoComplete="off"
              autoFocus
            />
            <p className="acesso__hint">Fornecido no e-mail de boas-vindas.</p>
            {error && <p className="acesso__error">{error}</p>}

            <button type="submit" className="acesso__btn">
              Continuar
            </button>
          </form>

          <hr className="acesso__divider" />

          <p className="acesso__signup">
            Ainda não tem conta?{' '}
            <Link href="/onboarding">Cadastrar operadora</Link>
          </p>
        </div>
      </main>
    </>
  )
}
