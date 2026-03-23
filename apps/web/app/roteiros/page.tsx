import Link from "next/link"

async function getRoteiros(slug: string) {
  const res = await fetch(
    process.env.NEXT_PUBLIC_API_URL + "/tenants/" + slug + "/packages",
    { next: { revalidate: 300 } }
  )

  if (!res.ok) return []
  return res.json()
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const map: Record<string, { label: string; className: string }> = {
    EASY: { label: "Fácil", className: "bg-green-100 text-green-700" },
    MODERATE: { label: "Moderado", className: "bg-yellow-100 text-yellow-700" },
    HARD: { label: "Difícil", className: "bg-red-100 text-red-700" },
  }

  const item = map[difficulty] || map.EASY

  return (
    <span
      className={
        "text-xs font-medium px-2 py-1 rounded-full " + item.className
      }
    >
      {item.label}
    </span>
  )
}

export default async function RoteirosPage() {
  const roteiros = await getRoteiros("serra-viva")

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-white border-b border-gray-100 px-4 py-16 text-center">
        <p className="text-sm font-medium text-orange-600 mb-2 tracking-wide uppercase">
          Patrimônio Mundial UNESCO
        </p>

        <h1 className="text-4xl font-bold text-[#1A1A1A] mb-3 tracking-tight">
          Serra da Capivara
        </h1>

        <p className="text-gray-500 max-w-md mx-auto">
          Explore sítios arqueológicos com mais de 25 mil anos de história
        </p>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <p className="text-sm text-gray-400 mb-6">
          {roteiros.length} roteiros disponíveis
        </p>

        <div className="grid gap-4">
          {roteiros.map((roteiro: any) => (
            <Link
              key={roteiro.id}
                href={"/roteiros/detalhe?id=" + roteiro.id}              className="block bg-white border border-gray-100 rounded-2xl p-6 hover:border-orange-200 hover:shadow-sm transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DifficultyBadge difficulty={roteiro.difficulty} />
                    <span className="text-xs text-gray-400">
                      {roteiro.duration}h de duração
                    </span>
                  </div>

                  <h2 className="text-lg font-semibold text-[#1A1A1A] mb-1">
                    {roteiro.name}
                  </h2>

                  <p className="text-gray-500 text-sm leading-relaxed">
                    {roteiro.description}
                  </p>

                  {roteiro.departureSlots?.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {roteiro.departureSlots
                        .slice(0, 3)
                        .map((slot: any) => (
                          <span
                            key={slot.id}
                            className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full"
                          >
                            {new Date(slot.startsAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-[#1A1A1A]">
                    R$ {Number(roteiro.price).toFixed(2)}
                  </p>

                  <p className="text-xs text-gray-400 mt-1">por pessoa</p>

                  <div className="mt-3 bg-orange-500 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                    Ver datas
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}