"use client"
import { useState, type ReactNode } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { CalendarCheck, Check, Compass, ShieldCheck } from "lucide-react"
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

const CPF_ERROR = "CPF deve conter 11 dígitos numéricos."

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-5 border-0">
      <legend className="mb-4 text-base font-bold">{title}</legend>
      {children}
    </fieldset>
  )
}

export default function CadastroCondutorPage() {
  const params = useParams<{ slug: string }>()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function formatCpf(value: string) {
    return value.replace(/\D/g, "").slice(0, 11)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const cpfDigits = cpf.replace(/\D/g, "")
    if (cpfDigits.length !== 11) {
      setError(CPF_ERROR)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/tenants/${params.slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, cpf: cpfDigits, role: "CONDUTOR" }),
      })
      if (res.ok) {
        setSuccess(true)
        return
      }
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) {
        setError(data.message ?? "E-mail ou CPF já cadastrado.")
      } else if (res.status === 404) {
        setError("Operadora não encontrada. Verifique o link de cadastro.")
      } else if (data.errors?.length) {
        setError(data.errors[0].message)
      } else {
        setError(data.message ?? "Erro ao criar conta. Tente novamente.")
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // Erro de validação local vai para o campo; o resto (API, conexão) fica no Alert.
  const cpfError = error === CPF_ERROR ? error : null
  const formError = cpfError ? null : error

  if (success) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-success-subtle text-success">
            <Check size={32} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="mt-6 text-sm font-semibold text-fg-primary">{params.slug}</p>
          <h1 className="mt-1 text-2xl font-bold">Cadastro enviado</h1>
        </div>
        <Alert tone="warning" title="Aguardando aprovação" className="mt-6">
          Seu cadastro foi recebido e está aguardando aprovação da operadora.
          Você receberá um e-mail quando for aprovado.
        </Alert>
        <Button href={`/${params.slug}/login`} size="lg" fullWidth className="mt-8">
          Ir para o login
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <p className="mb-2 text-sm font-semibold text-fg-primary">{params.slug}</p>
      <h1 className="text-2xl font-bold">Seja um guia</h1>
      <p className="mt-2 text-fg-secondary">Crie sua conta como condutor nesta operadora.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-8">
        <FormSection title="Seus dados">
          <Input
            id="name"
            label="Nome completo"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="email"
            label="E-mail"
            type="email"
            inputMode="email"
            required
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="cpf"
            label="CPF"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            placeholder="Somente números (11 dígitos)"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            error={cpfError}
            hint="Armazenado de forma segura (LGPD)"
          />
        </FormSection>

        <FormSection title="Acesso">
          <Input
            id="password"
            label="Senha"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint="Mínimo 8 caracteres"
          />
        </FormSection>

        <div className="flex flex-col gap-4">
          {formError && <Alert tone="danger">{formError}</Alert>}
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Cadastrar como guia
          </Button>
        </div>
      </form>

      <div className="mt-6 flex flex-col items-center gap-1 text-center text-sm text-fg-secondary">
        <p>
          Já tem conta?{" "}
          <Link
            href={`/${params.slug}/login`}
            className="inline-flex min-h-11 items-center font-semibold text-fg-primary underline-offset-4 hover:underline"
          >
            Entrar no painel
          </Link>
        </p>
        <p>
          Sem código de operadora?{" "}
          <Link
            href="/cadastro/guia"
            className="inline-flex min-h-11 items-center font-semibold text-fg-primary underline underline-offset-4"
          >
            Cadastre-se como guia independente
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
