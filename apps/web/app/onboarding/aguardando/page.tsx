import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { CalendarCheck, Check, Compass, Mail, ShieldCheck } from "lucide-react"
import { Alert, Button, Stepper } from "@/src/components/ui/capi"

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

const WHILE_YOU_WAIT = [
  { icon: Mail, text: "Fique de olho no seu e-mail (e na caixa de spam): avisamos por lá assim que a análise terminar." },
  { icon: Compass, text: "Explore os roteiros publicados para ver como os viajantes encontram as operadoras." },
  { icon: CalendarCheck, text: "Separe os dados dos seus guias e roteiros para cadastrar assim que o acesso for liberado." },
]

export default function OnboardingAguardando() {
  return (
    <AuthLayout>
      <Stepper steps={["Cadastro enviado", "Aguardando aprovação", "Acesso liberado"]} current={1} />

      <div className="mt-8 flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success-subtle text-success">
          <Check size={32} strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h1 className="mt-6 text-2xl font-bold">Cadastro recebido!</h1>
      </div>

      <Alert tone="warning" title="Aguardando aprovação" className="mt-6">
        Sua solicitação está sendo analisada pela equipe CAPI. Você receberá um email quando for aprovada.
      </Alert>

      <h2 className="mt-8 text-base font-bold">Enquanto isso, você pode</h2>
      <ul className="mt-4 flex flex-col gap-4">
        {WHILE_YOU_WAIT.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-fg-secondary">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle text-fg-primary">
              <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="pt-1.5">{text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-3">
        <Button href="/explorar" size="lg" fullWidth>
          Explorar roteiros
        </Button>
        <Button href="/" variant="ghost" fullWidth>
          Voltar para o início
        </Button>
      </div>
    </AuthLayout>
  )
}
