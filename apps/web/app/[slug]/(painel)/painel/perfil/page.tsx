"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import BackButton from "@/src/components/ui/BackButton"
import { PhotoUploadArea } from "@/src/components/ui/PhotoUploadArea"

interface GuideProfileData {
  id: string
  bio: string | null
  photoUrl: string | null
  especialidades: string[]
  regioes: string[]
  portfolioPhotos: string[]
  user: {
    id: string
    name: string
    email: string
    approvalStatus: string
    cpf?: string | null
  }
}

interface Memberships {
  destinations: { slug: string; title: string }[]
  packages: {
    id: string
    name: string
    destinationSlug: string | null
    state: "PENDING" | "REJECTED" | "IN"
    rejectionReason: string | null
  }[]
}

function membershipBadge(state: "PENDING" | "REJECTED" | "IN", reason: string | null) {
  if (state === "PENDING") return "Aguardando aprovação"
  if (state === "REJECTED") return `Recusado: ${reason ?? ""}`
  return "Você atua aqui ✓"
}

export default function PerfilPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { data: session } = useSession()
  const sessionUserId = (session?.user as any)?.id ?? ""

  const [slug, setSlug] = useState("")
  const [profile, setProfile] = useState<GuideProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [memberships, setMemberships] = useState<Memberships | null>(null)

  // Form fields
  const [bio, setBio] = useState("")
  const [especialidades, setEspecialidades] = useState("")
  const [regioes, setRegioes] = useState("")
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([])
  // Save state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Unwrap params Promise (Next.js 16 Client Components)
  useEffect(() => {
    Promise.resolve(params).then(({ slug: s }) => setSlug(s))
  }, [params])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setLoadError(false)

    fetch("/api/proxy?path=/guides/me")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        const p = data.profile ?? {}
        setProfile({
          id: "",
          bio: p.bio ?? null,
          photoUrl: p.photoUrl ?? null,
          especialidades: p.especialidades ?? [],
          regioes: p.regioes ?? [],
          portfolioPhotos: p.portfolioPhotos ?? [],
          user: {
            id: sessionUserId,
            name: (session?.user as any)?.name ?? "",
            email: (session?.user as any)?.email ?? "",
            approvalStatus: data.approvalStatus,
          },
        })
        setBio(p.bio ?? "")
        setEspecialidades((p.especialidades ?? []).join(", "))
        setRegioes((p.regioes ?? []).join(", "))
        setPortfolioPhotos(p.portfolioPhotos ?? [])
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [slug, sessionUserId])

  useEffect(() => {
    fetch("/api/proxy?path=/guides/me/memberships")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setMemberships(data))
      .catch(() => {})
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const res = await fetch(`/api/proxy?path=/tenants/${slug}/guides/me/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bio: bio || null,
          especialidades: especialidades
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          regioes: regioes
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          portfolioPhotos,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Erro ao salvar" }))
        throw new Error(err.message ?? "Erro ao salvar")
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message ?? "Não foi possível salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  async function handleUploadPhoto(file: File) {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/uploads/photos?folder=guides", { method: "POST", body: form })
    if (!res.ok) throw new Error("Falha ao enviar foto")
    const data = await res.json()
    const url = data.url ?? data.secure_url ?? data.path
    if (!url) throw new Error("URL não retornada")
    setPortfolioPhotos((prev) => [...prev, url])
  }

  function handleRemovePhoto(url: string) {
    setPortfolioPhotos((prev) => prev.filter((u) => u !== url))
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid var(--stone-300)",
    borderRadius: "4px",
    fontSize: "16px",
    color: "var(--stone-800)",
    background: "white",
    boxSizing: "border-box",
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "14px",
    color: "var(--stone-700)",
    marginBottom: "4px",
    fontWeight: 600,
  }

  const isApproved = profile?.user?.approvalStatus === "APPROVED"

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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "24px",
              color: "var(--stone-900)",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Meu Perfil
          </h1>

          {/* GUIDE-02: Badge de guia verificado */}
          {isApproved && (
            <span
              aria-label="Guia verificado pela plataforma"
              style={{
                background: "var(--ochre)",
                color: "white",
                fontSize: "11px",
                fontWeight: 600,
                padding: "4px 8px",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                whiteSpace: "nowrap",
              }}
            >
              Guia Verificado
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ maxWidth: "640px" }}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                height: "56px",
                marginBottom: "16px",
                borderRadius: "4px",
                background:
                  "linear-gradient(90deg, var(--stone-100) 25%, var(--stone-200) 50%, var(--stone-100) 75%)",
                backgroundSize: "200%",
                animation: "shimmer 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : loadError ? (
        <p style={{ fontSize: "16px", color: "var(--stone-500)" }}>
          Erro ao carregar dados. Tente novamente.
        </p>
      ) : (
        <form
          onSubmit={handleSave}
          style={{
            maxWidth: "640px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Nome (read-only) */}
          <div>
            <label style={labelStyle}>Nome</label>
            <input
              type="text"
              value={profile?.user?.name ?? ""}
              readOnly
              disabled
              style={{
                ...inputStyle,
                background: "var(--stone-100)",
                color: "var(--stone-500)",
                cursor: "not-allowed",
              }}
            />
          </div>

          {/* CPF (read-only se disponivel) */}
          {profile?.user &&
            "cpf" in profile.user &&
            profile.user.cpf && (
              <div>
                <label style={labelStyle}>CPF / CNPJ</label>
                <input
                  type="text"
                  value={String(profile.user.cpf)}
                  readOnly
                  disabled
                  style={{
                    ...inputStyle,
                    background: "var(--stone-100)",
                    color: "var(--stone-500)",
                    cursor: "not-allowed",
                  }}
                />
              </div>
            )}

          {/* Bio */}
          <div>
            <label htmlFor="bio" style={labelStyle}>
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "96px",
                fontFamily: "inherit",
              }}
              placeholder="Conte sua historia como guia..."
            />
          </div>

          {/* Especialidades */}
          <div>
            <label htmlFor="especialidades" style={labelStyle}>
              Especialidades
            </label>
            <input
              id="especialidades"
              type="text"
              value={especialidades}
              onChange={(e) => setEspecialidades(e.target.value)}
              placeholder="Ex: arqueologia, trilha, fotografia (separadas por vírgula)"
              style={inputStyle}
            />
            <p
              style={{
                fontSize: "14px",
                color: "var(--stone-400)",
                marginTop: "4px",
              }}
            >
              Separe com vírgulas
            </p>
          </div>

          {/* Regioes */}
          <div>
            <label htmlFor="regioes" style={labelStyle}>
              Regiões atendidas
            </label>
            <input
              id="regioes"
              type="text"
              value={regioes}
              onChange={(e) => setRegioes(e.target.value)}
              placeholder="Ex: Serra da Capivara, Piauí (separadas por vírgula)"
              style={inputStyle}
            />
            <p
              style={{
                fontSize: "14px",
                color: "var(--stone-400)",
                marginTop: "4px",
              }}
            >
              Separe com vírgulas
            </p>
          </div>

          {/* Portfólio de Fotos (GUIDE-04) */}
          <div>
            <label style={labelStyle}>Portfólio de Fotos</label>
            <p style={{ fontSize: "14px", color: "var(--stone-400)", marginTop: 0, marginBottom: "8px" }}>
              Faça upload das fotos do seu portfólio (máx. 5, até 5MB cada).
            </p>
            <PhotoUploadArea
              photos={portfolioPhotos}
              onAdd={handleUploadPhoto}
              onRemove={handleRemovePhoto}
              maxPhotos={5}
            />
          </div>

          {/* Save button + feedback */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? "var(--stone-400)" : "var(--ochre)",
                color: "white",
                padding: "8px 20px",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                minHeight: "44px",
              }}
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>

            {saveSuccess && (
              <p
                role="status"
                aria-live="polite"
                style={{ fontSize: "14px", color: "#15803D", margin: 0 }}
              >
                Perfil atualizado com sucesso.
              </p>
            )}

            {saveError && (
              <p
                role="alert"
                aria-live="assertive"
                style={{ fontSize: "14px", color: "#DC2626", margin: 0 }}
              >
                {saveError}
              </p>
            )}
          </div>
        </form>
      )}

      {memberships && (memberships.destinations.length > 0 || memberships.packages.length > 0) && (
        <section style={{ maxWidth: "640px", marginTop: "40px" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--stone-900)", margin: "0 0 16px" }}>
            Meus destinos e roteiros
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
            {memberships.destinations.map((d) => (
              <li key={d.slug} style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", padding: "12px", border: "1px solid var(--stone-200)", borderRadius: "4px" }}>
                <a href={`/destinos/${d.slug}`} style={{ color: "var(--stone-900)", fontWeight: 600 }}>{d.title}</a>
                <span style={{ fontSize: "14px", color: "#15803D" }}>{membershipBadge("IN", null)}</span>
              </li>
            ))}
            {memberships.packages.map((p) => (
              <li key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", padding: "12px", border: "1px solid var(--stone-200)", borderRadius: "4px" }}>
                <a
                  href={p.destinationSlug ? `/destinos/${p.destinationSlug}/roteiros/${p.id}` : `/${slug}/roteiros/${p.id}`}
                  style={{ color: "var(--stone-900)", fontWeight: 600 }}
                >
                  {p.name}
                </a>
                <span style={{ fontSize: "14px", color: p.state === "REJECTED" ? "#DC2626" : p.state === "IN" ? "#15803D" : "var(--stone-500)" }}>
                  {membershipBadge(p.state, p.rejectionReason)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}
