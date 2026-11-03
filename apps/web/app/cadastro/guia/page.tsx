"use client"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { ArrowLeft, Building2, CalendarCheck, Check, Compass, ShieldCheck, UserRound, Users } from "lucide-react"
import { Alert, Button, Input, ListGroup, ListRow, Select } from "@/src/components/ui/capi"
import { compressImage } from "@/lib/compress-image"

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

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-5 border-0">
      <legend className="mb-4 text-base font-bold">{title}</legend>
      {children}
    </fieldset>
  )
}

type Kind = "AUTONOMO" | "ASSOCIACAO" | "AGENCIA"
type CredentialType = "ICMBIO" | "CADASTUR"
type TenantOption = { id: string; name: string; slug: string; type: "AGENCIA" | "ASSOCIACAO" }

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
const NETWORK_ERROR = "Não foi possível enviar. Verifique sua conexão."
const CPF_ERROR = "CPF deve conter 11 dígitos numéricos."
const FILE_TYPE_ERROR = "Envie o comprovante em JPEG, PNG, WebP ou PDF"
const FILE_SIZE_ERROR = "O comprovante deve ter até 10 MB"

const KIND_OPTIONS = [
  { kind: "AUTONOMO", title: "Autônomo", text: "Atuo por conta própria", icon: UserRound },
  { kind: "ASSOCIACAO", title: "Associação", text: "Faço parte de uma associação de guias", icon: Users },
  { kind: "AGENCIA", title: "Agência", text: "Trabalho para uma agência", icon: Building2 },
] as const

export default function CadastroGuiaPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [kind, setKind] = useState<Kind | null>(null)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<TenantOption[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [tenant, setTenant] = useState<TenantOption | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
  const [credentialType, setCredentialType] = useState<CredentialType>("CADASTUR")
  const [credentialNumber, setCredentialNumber] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [networkFailed, setNetworkFailed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  const previewUrl = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file],
  )
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const needsTenant = kind === "ASSOCIACAO" || kind === "AGENCIA"
  const trimmedQuery = query.trim()

  useEffect(() => {
    if (step !== 2 || !kind || trimmedQuery.length < 2) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const res = await fetch(`/api/tenants/search?q=${encodeURIComponent(trimmedQuery)}`)
        if (!res.ok) throw new Error("search failed")
        const data = await res.json()
        if (cancelled) return
        const list: TenantOption[] = (data.tenants ?? []).filter((t: TenantOption) => t.type === kind)
        setResults(list.slice(0, 10))
      } catch {
        if (!cancelled) {
          setResults([])
          setSearchError("Não foi possível buscar agora. Tente de novo.")
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmedQuery, step, kind])

  function chooseKind(k: Kind) {
    setKind(k)
    setTenant(null)
    setQuery("")
    setResults([])
    setSearchError(null)
    setStep(k === "AUTONOMO" ? 3 : 2)
  }

  function validateFile(f: File): string | null {
    if (!ALLOWED_TYPES.includes(f.type)) return FILE_TYPE_ERROR
    if (!f.type.startsWith("image/") && f.size > MAX_FILE_BYTES) return FILE_SIZE_ERROR
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNetworkFailed(false)

    const cpfDigits = cpf.replace(/\D/g, "")
    if (cpfDigits.length !== 11) {
      setError(CPF_ERROR)
      return
    }
    if (!file) {
      setError(FILE_TYPE_ERROR)
      return
    }
    const fileError = validateFile(file)
    if (fileError) {
      setError(fileError)
      return
    }

    setLoading(true)
    try {
      const toSend = await compressImage(file)
      if (toSend.size > MAX_FILE_BYTES) {
        setError(FILE_SIZE_ERROR)
        return
      }
      const form = new FormData()
      form.append("name", name.trim())
      form.append("email", email.trim())
      form.append("password", password)
      form.append("cpf", cpfDigits)
      form.append("kind", kind ?? "AUTONOMO")
      if (needsTenant && tenant) form.append("tenantId", tenant.id)
      form.append("credentialType", credentialType)
      if (credentialNumber.trim()) form.append("credentialNumber", credentialNumber.trim())
      form.append("file", toSend, toSend.name)

      let res: Response
      try {
        res = await fetch("/api/auth/register-guide", { method: "POST", body: form })
      } catch {
        setNetworkFailed(true)
        setError(NETWORK_ERROR)
        return
      }

      if (res.status === 201) {
        const login = await signIn("credentials", { email: email.trim(), password, redirect: false }).catch(() => null)
        if (!login?.ok) {
          setRegistered(true)
          return
        }
        router.push("/guia/status")
        return
      }
      const data = await res.json().catch(() => ({}))
      if (data.errors?.length) setError(data.errors[0].message)
      else setError(data.message ?? "Erro ao criar conta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  // Erros de validação local vão para o campo; o resto (API, conexão) fica no Alert.
  const cpfError = error === CPF_ERROR ? error : null
  const fileFieldError = error === FILE_TYPE_ERROR || error === FILE_SIZE_ERROR ? error : null
  const formError = cpfError || fileFieldError ? null : error

  const stepTitle =
    step === 1 ? "Como você trabalha?" : step === 2 ? (kind === "AGENCIA" ? "Qual agência?" : "Qual associação?") : "Seus dados e comprovante"

  const loginLink = (
    <p className="mt-6 text-center text-sm text-fg-secondary">
      Já tem conta?{" "}
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center font-semibold text-fg-primary underline-offset-4 hover:underline"
      >
        Entrar
      </Link>
    </p>
  )

  if (registered) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-success-subtle text-success">
            <Check size={32} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-2xl font-bold">Cadastro enviado!</h1>
          <p className="mt-2 text-fg-secondary">Entre com seu e-mail e senha para acompanhar a verificação.</p>
        </div>
        <Button href="/login" size="lg" fullWidth className="mt-8">
          Entrar
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      {step > 1 && (
        <Button
          variant="ghost"
          size="sm"
          iconLeft={ArrowLeft}
          className="mb-4 -ml-2"
          onClick={() => setStep(step === 3 && needsTenant ? 2 : 1)}
        >
          Voltar
        </Button>
      )}
      <p className="text-sm font-semibold uppercase tracking-wide text-fg-secondary">Cadastro de guia</p>
      <h1 className="mt-2 text-2xl font-bold">{stepTitle}</h1>

      {step === 1 && (
        <div className="mt-8">
          <ListGroup>
            {KIND_OPTIONS.map(({ kind: k, title, text, icon: Icon }) => (
              <ListRow
                key={k}
                onClick={() => chooseKind(k)}
                leading={
                  <span className="flex size-10 items-center justify-center rounded-full bg-subtle text-fg-primary">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                }
                title={title}
                subtitle={text}
              />
            ))}
          </ListGroup>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8 flex flex-col gap-5">
          <Input
            id="tenant-search"
            label={`Buscar ${kind === "AGENCIA" ? "agência" : "associação"} pelo nome`}
            type="text"
            autoComplete="off"
            placeholder="Digite ao menos 2 letras"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setTenant(null)
              if (e.target.value.trim().length < 2) {
                setResults([])
                setSearching(false)
              }
            }}
            hint="Não encontrou? Cadastre-se como autônomo e peça o vínculo depois."
          />
          <div aria-live="polite" className="flex flex-col gap-3">
            {searching && trimmedQuery.length >= 2 && <p className="text-sm text-fg-secondary">Buscando…</p>}
            {searchError && <Alert tone="danger">{searchError}</Alert>}
            {!searching && !searchError && trimmedQuery.length >= 2 && results.length === 0 && (
              <p className="text-sm text-fg-secondary">Nenhum resultado.</p>
            )}
            {trimmedQuery.length >= 2 && results.length > 0 && (
              <ListGroup>
                {results.map((t) => {
                  const selected = tenant?.id === t.id
                  return (
                    <ListRow
                      key={t.id}
                      onClick={() => setTenant(t)}
                      title={t.name}
                      className={selected ? "bg-subtle" : undefined}
                      trailing={
                        selected ? (
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-success">
                            <Check size={16} strokeWidth={1.75} aria-hidden="true" /> Selecionada
                          </span>
                        ) : undefined
                      }
                    />
                  )
                })}
              </ListGroup>
            )}
          </div>
          <Button size="lg" fullWidth disabled={!tenant} onClick={() => setStep(3)}>
            Continuar
          </Button>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-8">
          {tenant && (
            <p className="text-sm text-fg-secondary">
              Vínculo declarado: <strong className="text-fg-primary">{tenant.name}</strong>
            </p>
          )}

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
              placeholder="Somente números"
              value={cpf}
              onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
              error={cpfError}
            />
          </FormSection>

          <FormSection title="Comprovante de atuação">
            <Select
              id="credentialType"
              label="Tipo de comprovante"
              value={credentialType}
              onChange={(e) => setCredentialType(e.target.value as CredentialType)}
              options={[
                { value: "CADASTUR", label: "Cadastur" },
                { value: "ICMBIO", label: "ICMBio" },
              ]}
            />
            <Input
              id="credentialNumber"
              label="Número"
              optional
              type="text"
              autoComplete="off"
              value={credentialNumber}
              onChange={(e) => setCredentialNumber(e.target.value)}
            />
            <Input
              id="file"
              label="Foto ou arquivo do comprovante"
              type="file"
              accept="image/*,application/pdf"
              required
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null
                setFile(f)
                setError(f ? validateFile(f) : null)
              }}
              error={fileFieldError}
              hint="JPEG, PNG, WebP ou PDF, até 10 MB"
            />
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Pré-visualização do comprovante"
                className="max-h-60 max-w-full rounded-md border border-line"
              />
            )}
            {file && !previewUrl && <p className="text-sm text-fg-secondary">{file.name}</p>}
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
              {networkFailed ? "Tentar de novo" : "Enviar cadastro"}
            </Button>
          </div>
        </form>
      )}

      {loginLink}
    </AuthLayout>
  )
}
