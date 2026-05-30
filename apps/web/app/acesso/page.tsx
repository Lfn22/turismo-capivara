'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

type Mode = 'slug' | 'email'
type Tenant = { slug: string; name: string }

export default function AcessoPage() {
  const [mode, setMode] = useState<Mode>('slug')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const router = useRouter()

  function reset() {
    setValue('')
    setError('')
    setTenants([])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError(mode === 'slug' ? 'Informe o identificador da sua conta.' : 'Informe seu email.')
      return
    }

    if (mode === 'slug') {
      router.push(`/${trimmed.toLowerCase()}/login`)
      return
    }

    // email mode
    setLoading(true)
    setError('')
    setTenants([])
    try {
      const res = await fetch(`/api/tenant-lookup?email=${encodeURIComponent(trimmed)}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? 'Erro ao buscar conta.')
        return
      }
      const found: Tenant[] = data.tenants ?? []
      if (found.length === 0) {
        setError('Nenhuma conta encontrada com este email.')
      } else if (found.length === 1) {
        router.push(`/${found[0].slug}/login`)
      } else {
        setTenants(found)
      }
    } catch {
      setError('Serviço indisponível. Tente novamente.')
    } finally {
      setLoading(false)
    }
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
          margin-bottom: 1.5rem;
        }

        .acesso__tabs {
          display: flex;
          gap: 0;
          border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }

        .acesso__tab {
          flex: 1;
          padding: 0.55rem 0.75rem;
          font-family: var(--font-body);
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--stone-500, #78716c);
          background: none;
          border: none;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }

        .acesso__tab--active {
          background: var(--stone-900, #1c1917);
          color: #fff;
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

        .acesso__input:focus { border-color: var(--ochre); }

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
          margin-top: 0.5rem;
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

        .acesso__btn:hover:not(:disabled) { background: var(--ochre-dark, #a07010); }
        .acesso__btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .acesso__tenants {
          margin-top: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .acesso__tenant-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.75rem 1rem;
          font-family: var(--font-body);
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--stone-900, #1c1917);
          background: var(--stone-50, #fafaf9);
          border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 3px;
          cursor: pointer;
          text-align: left;
          transition: border-color 0.15s, background 0.15s;
        }

        .acesso__tenant-btn:hover {
          border-color: var(--ochre);
          background: #fff;
        }

        .acesso__tenant-slug {
          font-size: 0.78rem;
          color: var(--stone-400, #a8a29e);
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

        .acesso__signup a:hover { text-decoration: underline; }
      `}</style>

      <main className="acesso">
        <div className="acesso__card">
          <Link href="/" style={{ display: 'inline-block', marginBottom: '1.75rem' }}>
            <Image src="/images/logo.png" alt="CAPI" width={120} height={108} style={{ display: 'block' }} />
          </Link>
          <h1 className="acesso__title">Acessar painel</h1>

          <div className="acesso__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'slug'}
              className={`acesso__tab${mode === 'slug' ? ' acesso__tab--active' : ''}`}
              onClick={() => { setMode('slug'); reset() }}
            >
              Identificador
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'email'}
              className={`acesso__tab${mode === 'email' ? ' acesso__tab--active' : ''}`}
              onClick={() => { setMode('email'); reset() }}
            >
              Email
            </button>
          </div>

          {tenants.length > 0 ? (
            <>
              <p className="acesso__hint" style={{ marginBottom: '0.25rem' }}>
                Encontramos {tenants.length} contas com este email. Escolha uma:
              </p>
              <div className="acesso__tenants">
                {tenants.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    className="acesso__tenant-btn"
                    onClick={() => router.push(`/${t.slug}/login`)}
                  >
                    <span>{t.name}</span>
                    <span className="acesso__tenant-slug">{t.slug}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="acesso__btn"
                style={{ marginTop: '1rem', background: 'none', color: 'var(--stone-500)', border: '1px solid var(--stone-200)' }}
                onClick={() => reset()}
              >
                ← Voltar
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              {mode === 'slug' ? (
                <>
                  <label htmlFor="slug" className="acesso__label">Identificador da conta</label>
                  <input
                    id="slug"
                    className="acesso__input"
                    type="text"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError('') }}
                    placeholder="ex: serra-viva"
                    autoComplete="off"
                    autoFocus
                  />
                  <p className="acesso__hint">Fornecido no e-mail de boas-vindas.</p>
                </>
              ) : (
                <>
                  <label htmlFor="email" className="acesso__label">Email de cadastro</label>
                  <input
                    id="email"
                    className="acesso__input"
                    type="email"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError('') }}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    autoFocus
                  />
                  <p className="acesso__hint">Email usado no cadastro da operadora.</p>
                </>
              )}
              {error && <p className="acesso__error">{error}</p>}
              <button type="submit" className="acesso__btn" disabled={loading}>
                {loading ? 'Buscando...' : 'Continuar'}
              </button>
            </form>
          )}

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
