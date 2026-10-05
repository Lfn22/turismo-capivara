"use client"
import { signIn, getSession } from "next-auth/react"
import { useState, Suspense, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { CalendarCheck, Compass, ShieldCheck, UserPlus } from "lucide-react"
import { lookupTenant } from "@/lib/auth-client"
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

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [step, setStep] = useState<"email" | "password">("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [tenantName, setTenantName] = useState("")
  const [tenantSlug, setTenantSlug] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await lookupTenant(email.trim())
      if (!result) {
        setError("Nenhuma conta encontrada com esse email.")
        return
      }
      setTenantName(result.tenantName)
      setTenantSlug(result.tenantSlug)
      setStep("password")
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantSlug,
        redirect: false,
      })
      if (!result?.ok) {
        setError("Email ou senha incorretos.")
        return
      }
      const session = await getSession()
      const role = (session?.user as { role?: string })?.role
      if (role === "SUPER_ADMIN") {
        router.push("/super-admin/operadoras")
      } else if (role === "ADMIN") {
        router.push(`/${tenantSlug}/admin/guias`)
      } else {
        router.push(`/${tenantSlug}/painel/dashboard`)
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function goBackToEmail() {
    setStep("email")
    setPassword("")
    setError(null)
    setTenantName("")
    setTenantSlug("")
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Acessar o painel</h1>
      <p className="mt-2 text-fg-secondary">
        {step === "email"
          ? "Informe seu e-mail para encontrarmos a sua operadora."
          : "Digite sua senha para entrar."}
      </p>

      {urlError === "forbidden" && (
        <Alert tone="warning" className="mt-6">
          Acesso restrito. Faça login para continuar.
        </Alert>
      )}

      {step === "email" ? (
        <>
          <form onSubmit={handleEmailSubmit} className="mt-8 flex flex-col gap-5">
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
              Continuar
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            <span className="text-sm text-fg-secondary">ou</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <Button href="/onboarding" variant="secondary" size="lg" fullWidth iconLeft={UserPlus}>
            Cadastrar agência ou guia
          </Button>
        </>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="mt-8 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{tenantName}</p>
              <p className="truncate text-sm text-fg-secondary">{email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={goBackToEmail}>
              Não é você?
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            <Input
              id="password"
              label="Senha"
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Link
              href="/login/esqueci-a-senha"
              className="inline-flex min-h-11 items-center self-end text-sm font-semibold text-fg-primary underline-offset-4 hover:underline"
            >
              Esqueceu a senha?
            </Link>
          </div>

          {error && <Alert tone="danger">{error}</Alert>}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            Entrar
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
