"use client"
import { useState, Suspense, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, CalendarCheck, Check, Compass, ShieldCheck } from "lucide-react"
import { resetPassword } from "@/lib/auth-client"
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

const MISMATCH_ERROR = "As senhas não coincidem."
const LENGTH_ERROR = "A senha deve ter no mínimo 8 caracteres."

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const tokenMissing = !token

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError(MISMATCH_ERROR)
      return
    }

    if (newPassword.length < 8) {
      setError(LENGTH_ERROR)
      return
    }

    setLoading(true)
    try {
      await resetPassword(token!, newPassword)
      setSuccess(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      if (msg.toLowerCase().includes("expir") || msg.toLowerCase().includes("invalid") || msg.toLowerCase().includes("inválid")) {
        setError("O link de recuperação é inválido ou já expirou.")
      } else {
        setError("Erro de conexão. Verifique sua internet e tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Erros de validação local vão para o campo; o resto (API, conexão) fica no Alert.
  const lengthError = error === LENGTH_ERROR ? error : null
  const mismatchError = error === MISMATCH_ERROR ? error : null
  const formError = lengthError || mismatchError ? null : error

  if (success) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-success-subtle text-success">
            <Check size={32} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-bold">Senha redefinida</h1>
          <p className="mt-2 text-fg-secondary">Senha redefinida com sucesso. Use a nova senha para entrar.</p>
        </div>
        <Button href="/login" size="lg" fullWidth className="mt-8">
          Acessar o painel
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Criar nova senha</h1>
      <p className="mt-2 text-fg-secondary">Escolha uma senha com pelo menos 8 caracteres.</p>

      {tokenMissing ? (
        <div className="mt-8 flex flex-col gap-4">
          <Alert tone="danger">O link de recuperação é inválido ou já expirou.</Alert>
          <Button href="/login/esqueci-a-senha" size="lg" fullWidth>
            Solicitar novo link
          </Button>
          <Button href="/login" variant="ghost" fullWidth iconLeft={ArrowLeft}>
            Voltar para o login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <Input
            id="newPassword"
            label="Nova senha"
            type="password"
            required
            minLength={8}
            autoFocus
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={lengthError}
            hint="Mínimo 8 caracteres"
          />

          <Input
            id="confirmPassword"
            label="Confirmar nova senha"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={mismatchError}
          />

          {formError && (
            <Alert
              tone="danger"
              action={
                <Button href="/login/esqueci-a-senha" variant="link" size="sm">
                  Solicitar novo link
                </Button>
              }
            >
              {formError}
            </Alert>
          )}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            Redefinir senha
          </Button>

          <Button href="/login" variant="ghost" fullWidth iconLeft={ArrowLeft}>
            Voltar para o login
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
