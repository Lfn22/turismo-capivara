"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import BackButton from "@/src/components/ui/BackButton"

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

  // Form fields
  const [bio, setBio] = useState("")
  const [especialidades, setEspecialidades] = useState("")
  const [regioes, setRegioes] = useState("")
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>([])
  const [newPhotoUrl, setNewPhotoUrl] = useState("")
  const [photoUrlError, setPhotoUrlError] = useState<string | null>(null)

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

    // GET /tenants/:slug/guides returns only APPROVED guides.
    // For PENDING guides, fall back to an empty profile using session data.
    fetch(`/api/proxy?path=/tenants/${slug}/guides`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        const guides: GuideProfileData[] = Array.isArray(data)
          ? data
          : data.guides ?? []
        const mine = guides.find((g) => g.user?.id === sessionUserId)
        if (mine) {
          setProfile(mine)
          setBio(mine.bio ?? "")
          setEspecialidades((mine.especialidades ?? []).join(", "))
          setRegioes((mine.regioes ?? []).join(", "))
          setPortfolioPhotos(mine.portfolioPhotos ?? [])
        } else {
          // Guia PENDING ou sem perfil aprovado — exibir formulário vazio
          setProfile({
            id: "",
            bio: null,
            photoUrl: null,
            especialidades: [],
            regioes: [],
            portfolioPhotos: [],
            user: {
              id: sessionUserId,
              name: (session?.user as any)?.name ?? "",
              email: (session?.user as any)?.email ?? "",
              approvalStatus: "PENDING_APPROVAL",
            },
          })
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [slug, sessionUserId])

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

  function handleAddPhoto() {
    setPhotoUrlError(null)
    if (!newPhotoUrl.trim()) {
      setPhotoUrlError("Informe uma URL.")
      return
    }
    try {
      new URL(newPhotoUrl.trim())
    } catch {
      setPhotoUrlError("URL invalida. Use o formato https://...")
      return
    }
    setPortfolioPhotos((prev) => [...prev, newPhotoUrl.trim()])
    setNewPhotoUrl("")
  }

  function handleRemovePhoto(idx: number) {
    setPortfolioPhotos((prev) => prev.filter((_, i) => i !== idx))
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
            <p
              style={{
                fontSize: "14px",
                color: "var(--stone-400)",
                marginTop: 0,
                marginBottom: "8px",
              }}
            >
              Adicione URLs de fotos do seu portfólio.
            </p>

            {portfolioPhotos.length > 0 && (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 12px 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {portfolioPhotos.map((url, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "var(--stone-50)",
                      border: "1px solid var(--stone-200)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                    }}
                  >
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        fontSize: "14px",
                        color: "var(--ochre)",
                        wordBreak: "break-all",
                        textDecoration: "none",
                      }}
                    >
                      {url}
                    </a>
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      aria-label={`Remover foto ${idx + 1}`}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#DC2626",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        padding: "4px 8px",
                      }}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <input
                  type="url"
                  value={newPhotoUrl}
                  onChange={(e) => {
                    setNewPhotoUrl(e.target.value)
                    setPhotoUrlError(null)
                  }}
                  placeholder="https://exemplo.com/foto.jpg"
                  style={{
                    ...inputStyle,
                    borderColor: photoUrlError
                      ? "#DC2626"
                      : "var(--stone-300)",
                  }}
                  aria-describedby={
                    photoUrlError ? "photo-url-error" : undefined
                  }
                />
                {photoUrlError && (
                  <p
                    id="photo-url-error"
                    style={{
                      fontSize: "14px",
                      color: "#DC2626",
                      marginTop: "4px",
                    }}
                  >
                    {photoUrlError}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddPhoto}
                style={{
                  background: "var(--stone-900)",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  minHeight: "44px",
                }}
              >
                Adicionar Foto
              </button>
            </div>
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

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  )
}
