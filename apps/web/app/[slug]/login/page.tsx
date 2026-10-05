"use client"
import { signIn, getSession } from "next-auth/react"
import { useState, type ReactNode } from "react"
import { useRouter, useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { CalendarCheck, Compass, ShieldCheck } from "lucide-react"
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

export default function LoginPage() {
  const params = useParams<{ slug: string }>()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        email,
        password,
        tenantSlug: params.slug,
        redirect: false,
      })
      if (result?.error) {
        setError("Credenciais inválidas. Verifique seu email e senha.")
        return
      }
      const session = await getSession()
      const role = (session?.user as { role?: string })?.role
      if (role === "ADMIN") {
        router.push(`/${params.slug}/admin/guias`)
      } else if (role === "SUPER_ADMIN") {
        router.push(`/super-admin/operadoras`)
      } else {
        router.push(`/${params.slug}/painel/dashboard`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <p className="mb-2 text-sm font-semibold text-fg-primary">{params.slug}</p>
      <h1 className="text-2xl font-bold">Entrar no painel</h1>
      <p className="mt-2 text-fg-secondary">Use o e-mail e a senha cadastrados nesta operadora.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
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
          id="password"
          label="Senha"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <Alert tone="danger">{error}</Alert>}

        <Button type="submit" size="lg" fullWidth loading={loading}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  )
}
