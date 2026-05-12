import { getToken } from "next-auth/jwt"
import { headers } from "next/headers"
import { apiFetch } from "@/lib/api/client"
import { StatusBadge } from "@/components/ui/StatusBadge"

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

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const jwt = await getToken({ req: { headers: await headers() } as any, secret: process.env.NEXTAUTH_SECRET })
  const token = (jwt?.apiToken as string) ?? ""

  let bookings: Booking[] = []
  let packages: Package[] = []
  let loadError = false

  try {
    const [bookingsData, packagesData] = await Promise.all([
      apiFetch<{ bookings: Booking[] }>(`/tenants/${slug}/guides/me/bookings`, token),
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
          <p
            style={{
              textAlign: "center",
              padding: "48px 24px",
              fontSize: "16px",
              color: "var(--stone-500)",
              margin: 0,
            }}
          >
            Nenhuma reserva ainda. Crie um roteiro para começar.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
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
        )}
      </div>
    </>
  )
}
