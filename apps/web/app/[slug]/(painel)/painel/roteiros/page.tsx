import { getServerSession } from "next-auth"
import { getToken } from "next-auth/jwt"
import { headers } from "next/headers"
import { authOptions } from "@/lib/auth"
import { apiFetch } from "@/lib/api/client"
import Link from "next/link"
import BackButton from "@/src/components/ui/BackButton"
import EmptyState from "@/src/components/ui/EmptyState"

interface Package {
  id: string
  name: string
  description: string
  price: string | number
  difficulty: "EASY" | "MODERATE" | "HARD" | "EXTREME"
  active: boolean
  capacity: number
  conductorId?: string
}

const DIFFICULTY: Record<string, { label: string; bg: string; color: string }> = {
  EASY:     { label: "Fácil",    bg: "#F0FDF4", color: "#15803D" },
  MODERATE: { label: "Moderado", bg: "#FEF9EC", color: "#B45309" },
  HARD:     { label: "Difícil",  bg: "#FEF2F2", color: "#DC2626" },
  EXTREME:  { label: "Extremo",  bg: "#FEF2F2", color: "#7F1D1D" },
}

function formatPrice(price: string | number) {
  const n = typeof price === "string" ? parseFloat(price) : price
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default async function RoteirosPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  const jwt = await getToken({ req: { headers: await headers() } as any, secret: process.env.NEXTAUTH_SECRET })
  const token = (jwt?.apiToken as string) ?? ""
  const userId = (session?.user as any)?.id ?? ""
  const role = (session?.user as any)?.role ?? ""

  let packages: Package[] = []
  let loadError = false

  try {
    // Pass conductorId to the API so filtering happens server-side (avoids overfetch)
    const qs = role === "CONDUTOR" && userId ? `?conductorId=${encodeURIComponent(userId)}` : ""
    const data = await apiFetch<Package[]>(`/tenants/${slug}/packages${qs}`, token)
    packages = Array.isArray(data) ? data : []
  } catch {
    loadError = true
  }

  return (
    <>
      <BackButton />
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "32px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
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
            Meus Roteiros
          </h1>
        </div>

        <Link
          href={`/${slug}/painel/roteiros/novo`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--ochre)",
            color: "white",
            padding: "8px 20px",
            borderRadius: "4px",
            fontSize: "14px",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            textDecoration: "none",
            minHeight: "44px",
          }}
        >
          Novo Roteiro
        </Link>
      </div>

      {loadError ? (
        <p
          style={{
            textAlign: "center",
            padding: "48px 24px",
            fontSize: "16px",
            color: "var(--stone-500)",
          }}
        >
          Erro ao carregar dados. Tente novamente.
        </p>
      ) : packages.length === 0 ? (
        <EmptyState
          title="Nenhum roteiro cadastrado"
          description="Crie seu primeiro roteiro para começar a receber reservas."
          ctaLabel="Criar roteiro"
          ctaHref={`/${slug}/painel/roteiros/novo`}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {packages.map((pkg) => {
            const diff = DIFFICULTY[pkg.difficulty] ?? DIFFICULTY.MODERATE
            return (
              <div
                key={pkg.id}
                style={{
                  background: "white",
                  border: "1px solid var(--stone-200)",
                  borderRadius: "8px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "16px",
                      color: "var(--stone-800)",
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {pkg.name}
                  </h2>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: diff.bg,
                      color: diff.color,
                      whiteSpace: "nowrap",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    {diff.label}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: "14px",
                    color: "var(--stone-500)",
                    margin: 0,
                    lineHeight: 1.5,
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {pkg.description}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "auto",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "16px",
                      color: "var(--stone-800)",
                      margin: 0,
                      fontWeight: 600,
                    }}
                  >
                    {formatPrice(pkg.price)}
                  </p>
                  <span
                    style={{
                      fontSize: "11px",
                      color: pkg.active ? "#15803D" : "var(--stone-400)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {pkg.active ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <Link
                  href={`/${slug}/painel/disponibilidade`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    padding: "8px 16px",
                    border: "1px solid var(--stone-300)",
                    borderRadius: "4px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--stone-700)",
                    textDecoration: "none",
                    background: "transparent",
                    minHeight: "44px",
                  }}
                >
                  Gerenciar Slots
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
