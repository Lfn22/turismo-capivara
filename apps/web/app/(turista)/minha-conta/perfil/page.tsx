'use client'

import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { apiClient } from '@/src/lib/api-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

type Profile = {
  id: string
  name: string
  email: string
  photoUrl?: string
  cpf?: string
  createdAt: string
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient<Profile>('/me/profile')
      .then(({ ok, data }) => {
        if (ok && data) {
          setProfile(data)
          setName(data.name ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    setError('')
    try {
      const { ok } = await apiClient('/me/profile', { method: 'PATCH', body: { name } })
      if (ok) {
        setSuccess(true)
      } else {
        setError('Erro ao salvar. Tente novamente.')
      }
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const initial = (profile?.name ?? profile?.email ?? '?')[0].toUpperCase()

  return (
    <>
      <style>{`
        .perfil-page__title {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text);
          margin: 0 0 var(--space-6, 24px);
        }
        .perfil-loading {
          color: var(--text-secondary);
          font-size: var(--text-sm);
          padding: var(--space-6, 24px) 0;
        }
        .perfil-avatar {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: var(--primary);
          color: var(--on-primary, #fff);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-xl);
          font-weight: 700;
          flex-shrink: 0;
          overflow: hidden;
          margin-bottom: var(--space-6, 24px);
        }
        .perfil-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .perfil-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4, 16px);
        }
        .perfil-field {
          display: flex;
          flex-direction: column;
          gap: var(--space-1, 4px);
        }
        .perfil-field__label {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text);
        }
        .perfil-field__input {
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          color: var(--text);
          background: var(--surface);
          outline: none;
          transition: border-color 0.15s;
        }
        .perfil-field__input:focus {
          border-color: var(--primary);
        }
        .perfil-field__input:disabled {
          background: var(--bg-muted);
          color: var(--text-secondary);
          cursor: not-allowed;
        }
        .perfil-save-btn {
          padding: 10px 20px;
          background: var(--primary);
          color: var(--on-primary, #fff);
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
          align-self: flex-start;
        }
        .perfil-save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .perfil-save-btn:hover:not(:disabled) {
          opacity: 0.88;
        }
        .perfil-success {
          font-size: var(--text-sm);
          color: var(--primary);
          font-weight: 600;
        }
        .perfil-error {
          font-size: var(--text-sm);
          color: var(--red-700, #b91c1c);
          background: var(--red-50, #fef2f2);
          border-radius: var(--radius-md);
          padding: 8px 12px;
        }
        .perfil-logout-btn {
          margin-top: var(--space-8, 32px);
          padding: 10px 20px;
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
          align-self: flex-start;
        }
        .perfil-logout-btn:hover {
          border-color: var(--red-700, #b91c1c);
          color: var(--red-700, #b91c1c);
        }
      `}</style>

      <h1 className="perfil-page__title">Meu perfil</h1>

      {loading && <p className="perfil-loading">Carregando...</p>}

      {!loading && profile && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="perfil-avatar" aria-hidden="true">
            {profile.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photoUrl} alt={profile.name} />
            ) : (
              initial
            )}
          </div>

          <form className="perfil-form" onSubmit={handleSubmit}>
            <div className="perfil-field">
              <label className="perfil-field__label" htmlFor="perfil-name">
                Nome
              </label>
              <input
                id="perfil-name"
                className="perfil-field__input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="perfil-field">
              <label className="perfil-field__label" htmlFor="perfil-email">
                E-mail
              </label>
              <input
                id="perfil-email"
                className="perfil-field__input"
                type="email"
                value={profile.email}
                disabled
              />
            </div>

            {error && (
              <p className="perfil-error" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="perfil-success" aria-live="polite">
                Perfil atualizado!
              </p>
            )}

            <button type="submit" className="perfil-save-btn" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </form>

          <button
            type="button"
            className="perfil-logout-btn"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Sair da conta
          </button>
        </div>
      )}
    </>
  )
}
