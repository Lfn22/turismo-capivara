import Link from "next/link"

type Difficulty = "EASY" | "MODERATE" | "HARD"

interface DepartureSlot {
  id: string
  startsAt: string
  capacity: number
  booked: number
}

interface Roteiro {
  id: string
  name: string
  description: string
  duration: number
  capacity: number
  price: string | number
  difficulty: Difficulty
  departureSlots: DepartureSlot[]
}

async function getRoteiro(id: string): Promise<Roteiro | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

  try {
    const res = await fetch(
      `${baseUrl}/tenants/serra-viva/packages/${id}`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) return null

    const data = await res.json()

    // 🔒 validação mínima defensiva
    if (!data || typeof data !== "object") return null

    return data
  } catch (err) {
    console.error("Erro ao buscar roteiro:", err)
    return null
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return "Data inválida"

  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Fortaleza",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatPrice(price: string | number): string {
  const num = Number(price)
  if (!Number.isFinite(num)) return "—"
  return num.toFixed(2)
}

const DIFFICULTY: Record<Difficulty, { label: string; color: string }> = {
  EASY: { label: "Fácil", color: "var(--ochre-light)" },
  MODERATE: { label: "Moderado", color: "var(--ochre)" },
  HARD: { label: "Difícil", color: "var(--stone-600)" },
}

export default async function RoteiroPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  if (!id) {
    return (
      <div style={centerContainer}>
        <div style={{ textAlign: "center" }}>
          <p style={mutedText}>Roteiro não especificado.</p>
          <Link href="/roteiros" style={linkStyle}>
            Ver todos os roteiros
          </Link>
        </div>
      </div>
    )
  }

  const roteiro = await getRoteiro(id)

  if (!roteiro) {
    return (
      <div style={centerContainer}>
        <div style={{ textAlign: "center" }}>
          <p style={mutedText}>Roteiro não encontrado.</p>
          <Link href="/roteiros" style={linkStyle}>
            Ver todos os roteiros
          </Link>
        </div>
      </div>
    )
  }

  const preco = formatPrice(roteiro.price)

  const diff =
    roteiro.difficulty && DIFFICULTY[roteiro.difficulty]
      ? DIFFICULTY[roteiro.difficulty]
      : DIFFICULTY.MODERATE

  return (
    <div style={{ minHeight: "100vh", background: "var(--stone-50)" }}>
      <nav style={navStyle}>
        <div style={navInner}>
          <Link href="/" style={logoStyle}>
            Serra da Capivara
          </Link>

          <Link href="/roteiros" style={backLinkStyle}>
            ← Voltar para roteiros
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px" }}>
        {!roteiro.departureSlots?.length && (
          <p style={{ color: "var(--stone-500)" }}>
            Nenhuma data disponível no momento.
          </p>
        )}

        <div style={{ display: "grid", gap: "12px" }}>
          {roteiro.departureSlots?.map((slot) => {
            const vagasRestantes = Math.max(0, slot.capacity - slot.booked)
            const esgotado = vagasRestantes <= 0

            return (
              <div key={slot.id} style={{ ...cardStyle, opacity: esgotado ? 0.6 : 1 }}>
                <div>
                  <p style={dateStyle}>
                    {formatDate(slot.startsAt)}
                  </p>

                  <p style={{ color: esgotado ? "var(--stone-400)" : "var(--stone-500)" }}>
                    {esgotado
                      ? "Esgotado"
                      : `${vagasRestantes} vagas restantes`}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <p style={priceStyle}>R$ {preco}</p>

                  {esgotado ? (
                    <span style={disabledButton}>
                      Indisponível
                    </span>
                  ) : (
                    <Link
                      href={`/reservar?slot=${slot.id}`}
                      style={buttonStyle}
                    >
                      Reservar
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

/* ===== estilos reaproveitáveis ===== */

const centerContainer = {
  minHeight: "100vh",
  background: "var(--stone-50)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const mutedText = {
  color: "var(--stone-500)",
  marginBottom: "16px",
}

const linkStyle = {
  color: "var(--ochre)",
  textDecoration: "none",
  fontSize: "14px",
}

const navStyle = {
  background: "var(--stone-900)",
  borderBottom: "1px solid var(--stone-700)",
  padding: "20px 24px",
}

const navInner = {
  maxWidth: "1100px",
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-between",
}

const logoStyle = {
  fontFamily: "var(--font-display)",
  color: "var(--stone-100)",
  textDecoration: "none",
}

const backLinkStyle = {
  color: "var(--stone-400)",
  textDecoration: "none",
}

const cardStyle = {
  background: "white",
  border: "1px solid var(--stone-200)",
  borderRadius: "8px",
  padding: "24px 28px",
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "wrap" as const,
}

const dateStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "18px",
  color: "var(--stone-900)",
  textTransform: "capitalize" as const,
}

const priceStyle = {
  fontFamily: "var(--font-display)",
  fontSize: "24px",
  color: "var(--stone-900)",
}

const buttonStyle = {
  background: "var(--stone-900)",
  color: "white",
  padding: "10px 20px",
  borderRadius: "4px",
  textDecoration: "none",
}

const disabledButton = {
  background: "var(--stone-100)",
  color: "var(--stone-400)",
  padding: "10px 20px",
  borderRadius: "4px",
}