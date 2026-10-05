import { redirect } from "next/navigation"
import { getToken } from "next-auth/jwt"
import { cookies } from "next/headers"
import { apiFetch } from "@/lib/api/client"
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  Clock,
  Plus,
  Route,
  Ticket,
  Wallet,
} from "lucide-react"
import {
  Alert,
  Avatar,
  Badge,
  Button,
  EmptyState,
  ListGroup,
  ListRow,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/src/components/ui/capi"

interface Booking {
  id: string
  customerName: string
  pax: number
  status: string
  createdAt: string
  slot: {
    startsAt: string
    package: { name: string; price: string | number }
  }
}

interface Package {
  id: string
  name: string
  active: boolean
}

type DashboardMetrics = {
  bookings: { pending: number; confirmed: number; cancelled: number; completed: number; expired: number }
  revenue: { confirmed: number }
  upcomingSlots: Array<{ id: string; startsAt: string; booked: number; capacity: number; package: { name: string } }>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatSlotDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function bookingValue(b: Booking) {
  const price = Number(b.slot?.package?.price)
  return Number.isFinite(price) ? formatBRL(price * b.pax) : null
}

function pessoas(n: number) {
  return `${n} ${n === 1 ? "pessoa" : "pessoas"}`
}

const statGrid = "grid grid-cols-2 gap-3 sm:[grid-template-columns:repeat(auto-fit,minmax(160px,1fr))] sm:gap-4"

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-fg" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.35 }}>{children}</h2>
      {action}
    </div>
  )
}

function isToday(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const cookieStore = await cookies()
  const jwt = await getToken({
    req: { cookies: Object.fromEntries(cookieStore.getAll().map((c) => [c.name, c.value])) } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
  const token = (jwt?.apiToken as string) ?? ""
  const jwtRole = (jwt?.role as string) ?? ""

  if (!token) {
    redirect(`/login?callbackUrl=/${slug}/painel/dashboard`)
  }

  let bookings: Booking[] = []
  let packages: Package[] = []
  let loadError = false

  let dashboardMetrics: DashboardMetrics | null = null

  try {
    dashboardMetrics = await apiFetch<DashboardMetrics>(`/tenants/${slug}/dashboard`, token)
  } catch {
    // silently fail — metrics are additive, page still works
  }

  const bookingsPath =
    jwtRole === "CONDUTOR"
      ? `/tenants/${slug}/guides/me/bookings`
      : `/tenants/${slug}/bookings`

  try {
    const [bookingsData, packagesData] = await Promise.all([
      apiFetch<{ bookings: Booking[] }>(bookingsPath, token),
      apiFetch<{ packages: Package[] } | Package[]>(`/tenants/${slug}/packages?conductorId=${jwt?.sub}`, token),
    ])
    bookings = bookingsData.bookings ?? []
    packages = Array.isArray(packagesData)
      ? packagesData
      : (packagesData as { packages: Package[] }).packages ?? []
  } catch {
    loadError = true
  }

  const todayBookings = bookings.filter((b) => isToday(b.slot?.startsAt))
  const pending = bookings.filter((b) => b.status === "PENDING")
  const activePackages = packages.filter((p) => p.active)
  const recentBookings = bookings.slice(0, 5)

  const stats = [
    { label: "Reservas hoje", value: todayBookings.length, icon: CalendarCheck },
    { label: "Pendentes de confirmação", value: pending.length, icon: Clock },
    { label: "Roteiros ativos", value: activePackages.length, icon: Route },
    { label: "Total de reservas", value: bookings.length, icon: Ticket },
  ]

  const firstName = typeof jwt?.name === "string" ? jwt.name.split(" ")[0] : ""
  const header = (
    <PageHeader
      eyebrow={firstName ? `Olá, ${firstName}` : "Painel do guia"}
      title="Visão geral"
      description="Suas reservas, saídas e roteiros em um só lugar."
      actions={
        <Button href={`/${slug}/painel/reservas`} variant="secondary" iconRight={ArrowRight}>
          Ver reservas
        </Button>
      }
    />
  )

  if (loadError) {
    return (
      <>
        {header}
        <Alert
          tone="danger"
          title="Erro ao carregar dados. Tente novamente."
          action={
            <Button href={`/${slug}/painel/dashboard`} variant="secondary" size="sm">
              Recarregar
            </Button>
          }
        >
          Verifique sua conexão e recarregue a página.
        </Alert>
      </>
    )
  }

  return (
    <>
      {header}

      <div className="mb-8 flex flex-col gap-3">
        {pending.length > 0 && (
          <Alert
            tone="warning"
            title={`${pending.length} ${pending.length === 1 ? "reserva aguarda" : "reservas aguardam"} sua confirmação`}
            action={
              <Button href={`/${slug}/painel/reservas`} size="sm">
                Revisar pendentes
              </Button>
            }
          >
            Confirme ou cancele para o turista receber a resposta.
          </Alert>
        )}

        {/* Onboarding — só exibe quando não há roteiros cadastrados */}
        {activePackages.length === 0 && (
          <Alert
            tone="brand"
            title="Você ainda não tem roteiros cadastrados"
            action={
              <Button href={`/${slug}/painel/roteiros`} size="sm" iconLeft={Plus}>
                Criar roteiro
              </Button>
            }
          >
            Crie o primeiro para começar a receber reservas.
          </Alert>
        )}
      </div>

      <section className="mb-8" aria-labelledby="dash-hoje">
        <SectionTitle><span id="dash-hoje">Resumo</span></SectionTitle>
        <div className={statGrid}>
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
          ))}
        </div>
      </section>

      {dashboardMetrics && (
        <section className="mb-8" aria-labelledby="dash-geral">
          <SectionTitle><span id="dash-geral">Desempenho</span></SectionTitle>
          <div className={statGrid}>
            <StatCard label="Pendentes" value={dashboardMetrics.bookings.pending} icon={Clock} />
            <StatCard label="Confirmadas" value={dashboardMetrics.bookings.confirmed} icon={CircleCheck} />
            <StatCard
              label="Faturamento"
              value={`R$ ${dashboardMetrics.revenue.confirmed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
              icon={Wallet}
            />
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {dashboardMetrics && dashboardMetrics.upcomingSlots?.length > 0 && (
          <section aria-labelledby="dash-saidas">
            <SectionTitle
              action={
                <Button href={`/${slug}/painel/disponibilidade`} variant="link" size="sm">
                  Ver agenda
                </Button>
              }
            >
              <span id="dash-saidas">Próximas saídas</span>
            </SectionTitle>
            <ListGroup>
              {dashboardMetrics.upcomingSlots.map((s) => (
                <ListRow
                  key={s.id}
                  href={`/${slug}/painel/disponibilidade`}
                  leading={
                    <span
                      className="inline-flex items-center justify-center bg-primary-subtle text-fg-primary"
                      style={{ width: 40, height: 40, borderRadius: "var(--radius-md)" }}
                    >
                      <CalendarDays size={20} strokeWidth={1.75} aria-hidden="true" />
                    </span>
                  }
                  title={s.package?.name}
                  subtitle={formatSlotDate(s.startsAt)}
                  trailing={
                    <Badge tone={s.booked >= s.capacity ? "danger" : "neutral"}>
                      {s.booked}/{s.capacity} vagas
                    </Badge>
                  }
                />
              ))}
            </ListGroup>
          </section>
        )}

        <section aria-labelledby="dash-reservas">
          <SectionTitle
            action={
              recentBookings.length > 0 ? (
                <Button href={`/${slug}/painel/reservas`} variant="link" size="sm">
                  Ver todas
                </Button>
              ) : undefined
            }
          >
            <span id="dash-reservas">Últimas reservas</span>
          </SectionTitle>

          {recentBookings.length === 0 ? (
            <ListGroup>
              <EmptyState
                compact
                icon={Ticket}
                title="Nenhuma reserva ainda."
                description="Quando um turista reservar um roteiro, ela aparece aqui."
                action={
                  <Button href={`/${slug}/painel/roteiros`} iconLeft={Plus}>
                    Criar primeiro roteiro
                  </Button>
                }
              />
            </ListGroup>
          ) : (
            <ListGroup>
              {recentBookings.map((b) => (
                <ListRow
                  key={b.id}
                  leading={<Avatar name={b.customerName} size={40} />}
                  title={`${b.customerName} · ${pessoas(b.pax)}`}
                  subtitle={`${b.slot?.package?.name ?? ""} · ${formatDate(b.slot?.startsAt)}`}
                  trailing={<StatusBadge status={b.status} />}
                  meta={bookingValue(b)}
                />
              ))}
            </ListGroup>
          )}
        </section>
      </div>
    </>
  )
}


