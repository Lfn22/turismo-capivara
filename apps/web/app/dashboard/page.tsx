"use client"

import { useState } from "react"

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "", tenantSlug: "serra-viva" })
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"
      const res = await fetch(baseUrl + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setErro(data.message ?? "Credenciais invalidas.")
        return
      }

      localStorage.setItem("token", data.token)
      window.location.href = "/dashboard/reservas"
    } catch {
      setErro("Erro de conexao. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5EFE6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">
            Painel administrativo
          </h1>
          <p className="text-[#6B5B45] text-sm mt-1">
            Serra da Capivara Turismo
          </p>
        </div>
        <div className="bg-white border border-[#E8D5B7] rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#FDFAF6] border border-[#D9C5A0] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#B8A48A] focus:outline-none focus:border-orange-400 focus:bg-white transition-colors"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-1.5">
                Senha
              </label>
              <input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-[#FDFAF6] border border-[#D9C5A0] rounded-xl px-4 py-3 text-sm text-[#1A1A1A] placeholder-[#B8A48A] focus:outline-none focus:border-orange-400 focus:bg-white transition-colors"
                placeholder="••••••••"
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
              className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}