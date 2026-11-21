'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Input, Button } from '@/src/components/ui/capi'

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export default function CadastroForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${PUBLIC_API_URL}/tenants/capi/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'CLIENTE', name, email, password }),
      })

      if (res.status === 409) {
        setError('Este e-mail já está cadastrado.')
        return
      }

      if (!res.ok) {
        setError('Não foi possível criar a conta. Tente novamente.')
        return
      }

      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Conta criada, mas não foi possível fazer login automaticamente. Acesse /login.')
        return
      }

      router.push('/minha-conta/viagens')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg"
      >
        ← Voltar para início
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-fg">Criar conta</h1>
      <p className="mb-6 text-sm text-fg-secondary">
        Explore roteiros e reserve viagens com guias locais.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Nome completo"
          id="name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Input
          label="E-mail"
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Senha"
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint="Mínimo de 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          label="Confirmar senha"
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        {error ? (
          <p className="rounded-md bg-danger-subtle px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-secondary">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-primary underline-offset-2 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
