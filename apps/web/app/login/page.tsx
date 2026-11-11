'use client'
import { signIn, getSession } from 'next-auth/react'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { isPlatformStaff, safeCallbackUrl } from '@/lib/roles'
import { isGuideUnverified } from '@/lib/guide-status'
import { Alert, Button, Input } from '@/src/components/ui/capi'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const aviso = searchParams.get('aviso')
  const avisoText =
    aviso === 'senha'
      ? 'Senha alterada. Entre novamente com a nova senha.'
      : aviso === 'email'
        ? 'E-mail alterado. Entre novamente com o novo e-mail.'
        : null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      })
      if (!result?.ok) {
        setError('Email ou senha incorretos.')
        return
      }
      const session = await getSession()
      const role = session?.user?.role
      const tenantSlug = session?.user?.tenantSlug
      const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'), window.location.origin)
      if (callbackUrl) {
        router.push(callbackUrl)
      } else if (isPlatformStaff(role)) {
        router.push('/super-admin/operadoras')
      } else if (role === 'CONDUTOR' && (await isGuideUnverified())) {
        router.push('/guia/status')
      } else if (!tenantSlug) {
        router.push('/login')
      } else if (role === 'ADMIN') {
        router.push(`/${tenantSlug}/admin/guias`)
      } else {
        router.push(`/${tenantSlug}/painel/dashboard`)
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        background: 'var(--stone-50)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'white',
          border: '1px solid var(--stone-200)',
          borderRadius: '8px',
          padding: 'clamp(32px, 5vw, 48px) clamp(24px, 5vw, 40px)',
          width: '100%',
          maxWidth: '480px',
        }}
      >
        <Link href="/" style={{ display: 'inline-block', marginBottom: '20px' }}>
          <Image
            src="/images/logo.png"
            alt="CAPI"
            width={80}
            height={72}
            style={{ display: 'block' }}
          />
        </Link>

        <p
          style={{
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--ochre)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          CAPI
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '24px',
            fontWeight: 400,
            color: 'var(--stone-900)',
            lineHeight: 1.2,
            marginBottom: '28px',
          }}
        >
          Acessar o Painel
        </h1>

        {avisoText && (
          <Alert tone="success" className="mb-4">
            {avisoText}
          </Alert>
        )}

        {urlError === 'forbidden' && (
          <Alert tone="danger" className="mb-4">
            Acesso restrito. Faça login para continuar.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && <Alert tone="danger">{error}</Alert>}

          <Input
            id="email"
            label="Email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            id="password"
            label="Senha"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="text-right">
            <Link
              href="/login/esqueci-a-senha"
              className="text-sm font-semibold text-[var(--ochre)] no-underline hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <Button type="submit" fullWidth loading={loading} disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>

          <div className="flex items-center gap-3 my-1">
            <hr className="flex-1 border-0 border-t border-[var(--stone-200)]" />
            <span className="text-sm text-[var(--stone-500)]">ou</span>
            <hr className="flex-1 border-0 border-t border-[var(--stone-200)]" />
          </div>

          <p className="text-center text-sm text-[var(--stone-500)]">
            <Link
              href="/onboarding"
              className="font-semibold text-[var(--ochre)] no-underline hover:underline"
            >
              Cadastrar agência ou guia →
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
