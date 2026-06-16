import Link from "next/link"
import { redirect } from "next/navigation"
import { getToken } from "next-auth/jwt"
import { cookies } from "next/headers"
import { apiFetch } from "@/lib/api/client"
import { StatusBadge } from "@/components/ui/StatusBadge"
import BackButton from "@/src/components/ui/BackButton"

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

function isToday(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "var(--stone-50)", border: "1px solid var(--stone-200)", borderRadius: "8px", padding: "16px 20px" }}>
      <p style={{ fontSize: "11px", color: "var(--stone-500)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>{label}</p>
      <p style={{ fontSize: "24px", fontWeight: 600, color: "var(--stone-900)" }}>{value}</p>
    </div>
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
    { label: "Reservas hoje", value: todayBookings.length, accent: false },
    { label: "Pendentes de confirmação", value: pending.length, accent: pending.length > 0 },
    { label: "Roteiros ativos", value: activePackages.length, accent: false },
    { label: "Total de reservas", value: bookings.length, accent: false },
  ]

  if (loadError) {
    return (
      <div style={{ textAlign: "center", padding: "64px 24px" }}>
        <p style={{ fontSize: "16px", color: "var(--stone-500)" }}>
          Erro ao carregar dados. Tente novamente.
        </p>
      </div>
    )
  }

  return (
    <>
      <BackButton />
      {/* Page header */}
      <div style={{ marginBottom: "32px" }}>
        <p
          style={{
            fontSize: "11px",
            color: "var(--ochre)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "8px",
          }}
        >
          Painel do Guia
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "24px",
            color: "var(--stone-900)",
            lineHeight: 1.2,
          }}
        >
          Dashboard
        </h1>
      </div>

      {dashboardMetrics && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "32px" }}>
          <MetricCard label="Pendentes" value={dashboardMetrics.bookings.pending} />
          <MetricCard label="Confirmadas" value={dashboardMetrics.bookings.confirmed} />
          <MetricCard label="Faturamento" value={`R$ ${dashboardMetrics.revenue.confirmed.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
        </div>
      )}

      {/* Onboarding banner — só exibe quando não há roteiros cadastrados */}
      {activePackages.length === 0 && (
        <div
          style={{
            background: "var(--ochre)",
            borderRadius: "8px",
            padding: "20px 24px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#1c1917" }}>
            Você ainda não tem roteiros cadastrados. Crie o primeiro para começar a receber reservas.
          </p>
          <Link
            href={`/${slug}/painel/roteiros`}
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#1c1917",
              background: "rgba(0,0,0,0.12)",
              padding: "8px 16px",
              borderRadius: "4px",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Criar roteiro →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "white",
              border: `1px solid ${stat.accent ? "var(--ochre)" : "var(--stone-200)"}`,
              borderRadius: "8px",
              padding: "24px",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "24px",
                color: stat.accent ? "var(--ochre)" : "var(--stone-800)",
                margin: 0,
                lineHeight: 1,
              }}
            >
              {stat.value}
            </p>
            <p
              style={{
                fontSize: "14px",
                color: "var(--stone-500)",
                marginTop: "4px",
                marginBottom: 0,
              }}
            >
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent bookings */}
      <div
        style={{
          background: "white",
          border: "1px solid var(--stone-200)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--stone-200)" }}>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "16px",
              color: "var(--stone-800)",
              margin: 0,
            }}
          >
            Últimas reservas
          </h2>
        </div>

        {recentBookings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <p style={{ fontSize: "16px", color: "var(--stone-500)", margin: "0 0 16px" }}>
              Nenhuma reserva ainda.
            </p>
            <Link
              href={`/${slug}/painel/roteiros`}
              style={{
                display: "inline-block",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--stone-900)",
                background: "var(--ochre)",
                padding: "10px 20px",
                borderRadius: "4px",
                textDecoration: "none",
              }}
            >
              Criar primeiro roteiro →
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: "500px", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ background: "var(--stone-100)" }}>
                {["Data/hora", "Turista", "Roteiro", "Pax", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "var(--stone-700)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b, i) => (
                <tr
                  key={b.id}
                  style={{
                    background: i % 2 === 0 ? "white" : "var(--stone-50)",
                    borderBottom: "1px solid var(--stone-200)",
                  }}
                >
                  <td style={{ padding: "12px 16px" }}>{formatDate(b.slot?.startsAt)}</td>
                  <td style={{ padding: "12px 16px" }}>{b.customerName}</td>
                  <td style={{ padding: "12px 16px" }}>{b.slot?.package?.name}</td>
                  <td style={{ padding: "12px 16px" }}>{b.pax}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </>
  )
}
