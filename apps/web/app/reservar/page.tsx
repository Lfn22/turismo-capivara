"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface FormData {
  customerName: string
  customerEmail: string
  customerPhone: string
  pax: number
}

interface ApiError {
  message?: string
}

export default function ReservarPage() {
  const searchParams = useSearchParams()

  const slotId = searchParams.get("slot") ?? ""
  const tenant = searchParams.get("tenant") ?? "serra-viva"

  const [form, setForm] = useState<FormData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    pax: 1,
  })

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (loading) return

    setErro(null)

    if (!slotId) {
      setErro("Slot de reserva inválido. Volte e selecione uma data.")
      return
    }

    if (!form.customerName.trim()) {
      setErro("Nome é obrigatório.")
      return
    }

    if (!form.customerEmail.includes("@")) {
      setErro("E-mail inválido.")
      return
    }

    if (!form.customerPhone.trim()) {
      setErro("Telefone é obrigatório.")
      return
    }

    if (!form.pax || form.pax < 1) {
      setErro("Número de pessoas inválido.")
      return
    }

    setLoading(true)

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

      const res = await fetch(
        `${baseUrl}/tenants/${encodeURIComponent(tenant)}/bookings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slotId,
            ...form,
          }),
        }
      )

      let data: ApiError | null = null

      try {
        data = await res.json()
      } catch {
        // resposta não é JSON
      }

      if (!res.ok) {
        setErro(data?.message ?? "Erro ao realizar reserva.")
        return
      }

      setSucesso(true)
    } catch {
      setErro("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center border border-[#E8D5B7]">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-700 text-2xl">✓</span>
          </div>

          <h1 className="text-xl font-bold text-[#1A1A1A] mb-2">
            Reserva solicitada!
          </h1>

          <p className="text-[#6B5B45] text-sm mb-6">
            Entraremos em contato para confirmar os detalhes e pagamento.
          </p>

          <Link
            href="/roteiros"
            className="inline-block bg-[#14532D] hover:bg-[#166534] text-white text-sm font-medium px-6 py-2.5 rounded-full transition-colors"
          >
            Ver outros roteiros
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5EFE6]">
      <div className="bg-[#EDE0CC] border-b border-[#D9C5A0] px-4 py-10">
        <div className="max-w-lg mx-auto">
          <Link
            href="/roteiros"
            className="text-sm text-[#166534] hover:text-[#14532D] hover:underline mb-4 inline-block font-medium"
          >
            ← Voltar para roteiros
          </Link>

          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
            Solicitar reserva
          </h1>

          <p className="text-[#6B5B45] text-sm mt-1">
            Preencha seus dados para confirmar a reserva.
          </p>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-white border border-[#E8D5B7] rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-5">
            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-1.5">
                Nome completo
              </label>
              <input
                type="text"
                required
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
                className="w-full bg-[#FDFAF6] border border-[#D9C5A0] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#B8A48A] focus:outline-none focus:border-[#166534] focus:bg-white transition-colors"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                value={form.customerEmail}
                onChange={(e) =>
                  setForm({ ...form, customerEmail: e.target.value })
                }
                className="w-full bg-[#FDFAF6] border border-[#D9C5A0] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#B8A48A] focus:outline-none focus:border-[#166534] focus:bg-white transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-1.5">
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                required
                value={form.customerPhone}
                onChange={(e) =>
                  setForm({ ...form, customerPhone: e.target.value })
                }
                className="w-full bg-[#FDFAF6] border border-[#D9C5A0] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#B8A48A] focus:outline-none focus:border-[#166534] focus:bg-white transition-colors"
                placeholder="(89) 99999-0000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-1.5">
                Número de pessoas
              </label>
              <input
                type="number"
                required
                min={1}
                max={20}
                value={form.pax}
                onChange={(e) =>
                  setForm({
                    ...form,
                    pax: Number(e.target.value) || 1,
                  })
                }
                className="w-full bg-[#FDFAF6] border border-[#D9C5A0] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#166534] focus:bg-white transition-colors"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#14532D] hover:bg-[#166534] active:bg-[#14532D] disabled:bg-[#A7C4A0] text-white font-semibold py-3 rounded-xl transition-colors text-sm tracking-wide"
            >
              {loading ? "Enviando..." : "Solicitar reserva"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#9C8470] mt-4">
          Após a solicitação, entraremos em contato via WhatsApp para confirmar.
        </p>
      </main>
    </div>
  )
}