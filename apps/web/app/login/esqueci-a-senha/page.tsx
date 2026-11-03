"use client"
import { useState, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, CalendarCheck, Compass, ShieldCheck } from "lucide-react"
import { requestPasswordReset } from "@/lib/auth-client"
import { Alert, Button, Input } from "@/src/components/ui/capi"

/* ── Layout de acesso (local; candidato a componente do DS) ── */
const BENEFITS = [
  { icon: Compass, text: "Roteiros e guias locais num só lugar" },
  { icon: CalendarCheck, text: "Reservas, agenda e check-in organizados" },
  { icon: ShieldCheck, text: "Guias e operadoras aprovados pela equipe CAPI" },
]

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-page lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between gap-12 bg-surface-brand p-12 text-on-brand lg:flex">
        <Link href="/" className="inline-block self-start rounded-sm">
          <Image src="/images/logo.png" alt="CAPI" width={120} height={108} className="block brightness-0 invert" />
        </Link>
        <div>
          <p className="font-display text-4xl leading-tight xl:text-5xl">Caminho entre quem explora e quem opera</p>
          <ul className="mt-10 flex flex-col gap-5">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3" style={{ color: "var(--text-on-brand-secondary)" }}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-on-brand" style={{ background: "var(--terra-700)" }}>
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="flex min-w-0 items-center justify-center py-10 lg:py-16">
        <div className="capi-container capi-container--form">
          <Link href="/" className="mb-8 inline-block rounded-sm lg:hidden">
            <Image src="/images/logo.png" alt="CAPI" width={120} height={108} priority className="block in-data-[theme=dark]:brightness-0 in-data-[theme=dark]:invert" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  )
}

export default function EsqueciASenhaPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch {
      setError("Erro ao enviar. Tente novamente em instantes.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Recuperar senha</h1>
      <p className="mt-2 text-fg-secondary">
        Informe seu email e enviaremos um link para redefinir sua senha.
      </p>

      {sent ? (
        <div className="mt-8 flex flex-col gap-6">
          <Alert tone="success" title="Confira seu e-mail">
            Se este email estiver cadastrado, você receberá as instruções em breve.
          </Alert>
          <Button href="/login" variant="secondary" size="lg" fullWidth iconLeft={ArrowLeft}>
            Voltar para o login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <Input
            id="email"
            label="E-mail"
            type="email"
            inputMode="email"
            required
            autoFocus
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {error && <Alert tone="danger">{error}</Alert>}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            Enviar link de recuperação
          </Button>

          <Button href="/login" variant="ghost" fullWidth iconLeft={ArrowLeft}>
            Voltar para o login
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
