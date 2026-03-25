import Link from "next/link"

type Difficulty = "EASY" | "MODERATE" | "HARD"

interface DepartureSlot {
  id: string
  startsAt: string
}

interface Roteiro {
  id: string
  name: string
  description?: string | null
  duration: number
  capacity: number
  price: number | string
  difficulty?: Difficulty
  departureSlots?: DepartureSlot[]
}

async function getRoteiros(slug: string): Promise<Roteiro[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL

    if (!baseUrl) {
      console.error("API URL não definida")
      return []
    }

    const res = await fetch(`${baseUrl}/tenants/${slug}/packages`, {
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      console.error("Erro ao buscar roteiros:", res.status)
      return []
    }

    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error("Erro de conexão:", err)
    return []
  }
}

const DIFFICULTY: Record<Difficulty, { label: string; color: string }> = {
  EASY: { label: "Fácil", color: "var(--ochre-light)" },
  MODERATE: { label: "Moderado", color: "var(--ochre)" },
  HARD: { label: "Difícil", color: "var(--stone-600)" },
}

export default async function RoteirosPage() {
  const roteiros = await getRoteiros("serra-viva")

  return (
    <div style={{ minHeight: "100vh", background: "var(--stone-50)" }}>
      <nav
        style={{
          background: "var(--stone-900)",
          borderBottom: "1px solid var(--stone-700)",
          padding: "20px 24px",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "18px",
              color: "var(--stone-100)",
              textDecoration: "none",
              letterSpacing: "-0.02em",
            }}
          >
            Serra da Capivara
          </Link>

          <p
            style={{
              fontSize: "11px",
              color: "var(--stone-400)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Roteiros
          </p>
        </div>
      </nav>

      <section
        style={{
          background: "var(--stone-900)",
          padding: "64px 24px 48px",
          borderBottom: "1px solid var(--stone-700)",
        }}
      >
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p
            style={{
              fontSize: "11px",
              color: "var(--ochre-light)",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              marginBottom: "16px",
            }}
          >
            Patrimônio Mundial UNESCO
          </p>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(32px, 5vw, 56px)",
              color: "var(--stone-50)",
              letterSpacing: "-0.03em",
              marginBottom: "16px",
            }}
          >
            Roteiros disponíveis
          </h1>

          <p
            style={{
              fontSize: "16px",
              color: "var(--stone-400)",
              maxWidth: "480px",
              lineHeight: "1.7",
            }}
          >
            Explore os sítios arqueológicos com condutores credenciados pelo ICMBio.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 24px" }}>
        <p
          style={{
            fontSize: "12px",
            color: "var(--stone-400)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "24px",
          }}
        >
          {roteiros.length} roteiro{roteiros.length !== 1 ? "s" : ""} encontrado
          {roteiros.length !== 1 ? "s" : ""}
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          {roteiros.map((roteiro) => {
            const diff =
              roteiro.difficulty && DIFFICULTY[roteiro.difficulty]
                ? DIFFICULTY[roteiro.difficulty]
                : DIFFICULTY.MODERATE

            return (
              <Link
                key={roteiro.id}
                href={`/roteiros/detalhe?id=${roteiro.id}`}
                style={{
                  display: "block",
                  background: "white",
                  border: "1px solid var(--stone-200)",
                  borderRadius: "8px",
                  padding: "32px",
                  textDecoration: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "24px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          color: diff.color,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        {diff.label}
                      </span>

                      <span
                        style={{
                          width: "3px",
                          height: "3px",
                          borderRadius: "50%",
                          background: "var(--stone-300)",
                        }}
                      />

                      <span style={{ fontSize: "12px", color: "var(--stone-400)" }}>
                        {roteiro.duration}h de duração
                      </span>
                    </div>

                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "22px",
                        color: "var(--stone-900)",
                        letterSpacing: "-0.02em",
                        marginBottom: "8px",
                      }}
                    >
                      {roteiro.name}
                    </h2>

                    {roteiro.description && (
                      <p
                        style={{
                          fontSize: "14px",
                          color: "var(--stone-500)",
                          lineHeight: "1.6",
                          maxWidth: "480px",
                        }}
                      >
                        {roteiro.description}
                      </p>
                    )}

                    {roteiro.departureSlots && roteiro.departureSlots.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "16px",
                          flexWrap: "wrap",
                        }}
                      >
                        {roteiro.departureSlots.slice(0, 3).map((slot) => {
                          const date = new Date(slot.startsAt)
                          if (isNaN(date.getTime())) return null

                          return (
                            <span
                              key={slot.id}
                              style={{
                                fontSize: "12px",
                                background: "var(--stone-100)",
                                color: "var(--stone-600)",
                                padding: "4px 10px",
                                borderRadius: "3px",
                                border: "1px solid var(--stone-200)",
                              }}
                            >
                              {date.toLocaleDateString("pt-BR")}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "32px",
                        color: "var(--stone-900)",
                        letterSpacing: "-0.03em",
                      }}
                    >
                      R${" "}
                      {Number(roteiro.price || 0).toFixed(2)}
                    </p>

                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--stone-400)",
                        marginTop: "4px",
                      }}
                    >
                      por pessoa
                    </p>

                    <div
                      style={{
                        marginTop: "16px",
                        background: "var(--stone-900)",
                        color: "white",
                        padding: "8px 20px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        display: "inline-block",
                      }}
                    >
                      Ver datas →
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}