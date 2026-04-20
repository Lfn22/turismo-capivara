import Link from "next/link"

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
  departureSlots?: DepartureSlot[]
}

async function getRoteiro(id: string): Promise<Roteiro | null> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

  try {
    const res = await fetch(
      `${baseUrl}/tenants/serra-viva/packages/${id}`,
      {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!res.ok) return null

    return await res.json()
  } catch {
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
  if (isNaN(num)) return "—"
  return num.toFixed(2)
}

export default async function RoteiroPage({
  params,
}: {
  params: { slug: string }
}) {
  const { slug } = params
  const roteiro = await getRoteiro(slug)

  if (!roteiro) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Roteiro não encontrado.</p>
          <Link
            href="/roteiros"
            className="text-orange-500 hover:underline text-sm"
          >
            Ver todos os roteiros
          </Link>
        </div>
      </div>
    )
  }

  const preco = formatPrice(roteiro.price)

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="bg-white border-b border-gray-100 px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/roteiros"
            className="text-sm text-orange-500 hover:underline mb-4 inline-block"
          >
            Voltar para roteiros
          </Link>

          <h1 className="text-3xl font-bold text-[#1A1A1A] tracking-tight mb-2">
            {roteiro.name}
          </h1>

          <p className="text-gray-500">{roteiro.description}</p>

          <div className="flex flex-wrap gap-6 mt-6 text-sm text-gray-600">
            <span>
              <span className="font-medium">Duração:</span>{" "}
              {roteiro.duration}h
            </span>

            <span>
              <span className="font-medium">Capacidade:</span> até{" "}
              {roteiro.capacity} pessoas
            </span>

            <span className="font-semibold text-orange-600">
              R$ {preco} por pessoa
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">
          Datas disponíveis
        </h2>

        {(!roteiro.departureSlots ||
          roteiro.departureSlots.length === 0) && (
          <p className="text-gray-400 text-sm">
            Nenhuma data disponível no momento.
          </p>
        )}

        <div className="grid gap-3">
          {roteiro.departureSlots?.map((slot) => {
            const vagasRestantes =
              (slot.capacity ?? 0) - (slot.booked ?? 0)

            const esgotado = vagasRestantes <= 0

            return (
              <div
                key={slot.id}
                className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-[#1A1A1A]">
                    {formatDate(slot.startsAt)}
                  </p>

                  <p
                    className={`text-sm mt-0.5 ${
                      esgotado ? "text-red-400" : "text-gray-400"
                    }`}
                  >
                    {esgotado
                      ? "Esgotado"
                      : `${vagasRestantes} vagas restantes`}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-[#1A1A1A]">
                    R$ {preco}
                  </p>

                  {esgotado ? (
                    <span className="mt-2 inline-block bg-gray-100 text-gray-400 text-sm font-medium px-4 py-2 rounded-full cursor-not-allowed">
                      Esgotado
                    </span>
                  ) : (
                    <Link
                      href={`/reservar/${slot.id}?roteiro=${encodeURIComponent(
                        roteiro.id
                      )}&tenant=serra-viva`}
                      className="mt-2 inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
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