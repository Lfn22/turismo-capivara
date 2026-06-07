"use client"
import { useState, useEffect } from "react"
import BackButton from "@/src/components/ui/BackButton"

interface DestinationData {
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  state: string
  highlights: string[]
  heroImageUrl: string | null
  photos: string[]
  tagline: string | null
}

export default function DestinoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const [slug, setSlug] = useState("")
  const [destination, setDestination] = useState<DestinationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  // Form fields
  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")
  const [description, setDescription] = useState("")
  const [tagline, setTagline] = useState("")
  const [highlights, setHighlights] = useState<string[]>([])
  const [heroImageUrl, setHeroImageUrl] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [newPhoto, setNewPhoto] = useState("")
  const [photoError, setPhotoError] = useState<string | null>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    Promise.resolve(params).then(({ slug: s }) => setSlug(s))
  }, [params])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setLoadError(false)

    fetch(`/api/tenants/${slug}/destination`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: DestinationData) => {
        setDestination(data)
        setTitle(data.title)
        setSubtitle(data.subtitle ?? "")
        setDescription(data.description ?? "")
        setTagline(data.tagline ?? "")
        setHighlights(data.highlights ?? [])
        setHeroImageUrl(data.heroImageUrl ?? "")
        setPhotos(data.photos ?? [])
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [slug])

  function setHighlight(idx: number, value: string) {
    setHighlights((prev) => prev.map((h, i) => (i === idx ? value : h)))
  }

  function addHighlight() {
    setHighlights((prev) => [...prev, ""])
  }

  function removeHighlight(idx: number) {
    setHighlights((prev) => prev.filter((_, i) => i !== idx))
  }

  function addPhoto() {
    setPhotoError(null)
    if (!newPhoto.trim()) {
      setPhotoError("Informe uma URL.")
      return
    }
    try {
      new URL(newPhoto.trim())
    } catch {
      setPhotoError("URL inválida. Use o formato https://...")
      return
    }
    if (photos.length >= 5) {
      setPhotoError("Máximo de 5 fotos.")
      return
    }
    setPhotos((prev) => [...prev, newPhoto.trim()])
    setNewPhoto("")
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!destination) return
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const res = await fetch(`/api/destinations/${destination.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          subtitle: subtitle.trim() || null,
          description: description.trim() || null,
          tagline: tagline.trim() || null,
          highlights: highlights.map((h) => h.trim()).filter(Boolean),
          heroImageUrl: heroImageUrl.trim() || null,
          photos: photos.map((p) => p.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message ?? `Erro ${res.status}`)
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message ?? "Não foi possível salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
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

  return (
    <>
      <BackButton />

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
            margin: 0,
          }}
        >
          Meu Destino
        </h1>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "640px" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "48px",
                borderRadius: "4px",
                background:
                  "linear-gradient(90deg, var(--stone-200) 25%, var(--stone-100) 50%, var(--stone-200) 75%)",
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
          style={{ maxWidth: "640px", display: "flex", flexDirection: "column", gap: "20px" }}
        >
          {/* Texto */}
          <div>
            <label style={labelStyle}>Frase de impacto</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder='Ex: "A natureza que cura quem chega"'
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Subtítulo</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Frase curta de apoio"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Separe parágrafos com uma linha em branco."
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {/* Destaques */}
          <div>
            <label style={labelStyle}>Pontos de interesse</label>
            <p style={{ fontSize: "14px", color: "var(--stone-400)", marginTop: 0, marginBottom: "8px" }}>
              Um por campo — aparecem nos cards do destino.
            </p>
            {highlights.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  value={h}
                  onChange={(e) => setHighlight(i, e.target.value)}
                  placeholder={`Ponto ${i + 1}`}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => removeHighlight(i)}
                  aria-label={`Remover ponto ${i + 1}`}
                  style={{
                    background: "transparent",
                    border: "1px solid #DC2626",
                    color: "#DC2626",
                    borderRadius: "4px",
                    padding: "0 12px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    minHeight: "44px",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addHighlight}
              style={{
                background: "transparent",
                border: "1px solid var(--stone-300)",
                color: "var(--stone-700)",
                borderRadius: "4px",
                padding: "6px 16px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Adicionar ponto
            </button>
          </div>

          {/* Imagens */}
          <div>
            <label style={labelStyle}>Imagem principal (hero)</label>
            <input
              type="url"
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              placeholder="https://exemplo.com/capa.jpg"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Galeria de fotos (máx. 5)</label>
            <p style={{ fontSize: "14px", color: "var(--stone-400)", marginTop: 0, marginBottom: "8px" }}>
              Adicione URLs de fotos para a galeria do destino.
            </p>

            {photos.length > 0 && (
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
                {photos.map((url, idx) => (
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
                      onClick={() => removePhoto(idx)}
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

            {photos.length < 5 && (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <input
                    type="url"
                    value={newPhoto}
                    onChange={(e) => {
                      setNewPhoto(e.target.value)
                      setPhotoError(null)
                    }}
                    placeholder="https://exemplo.com/foto.jpg"
                    style={{
                      ...inputStyle,
                      borderColor: photoError ? "#DC2626" : "var(--stone-300)",
                    }}
                    aria-describedby={photoError ? "photo-error" : undefined}
                  />
                  {photoError && (
                    <p id="photo-error" style={{ fontSize: "14px", color: "#DC2626", marginTop: "4px" }}>
                      {photoError}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addPhoto}
                  style={{
                    background: "var(--stone-800)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "8px 16px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    minHeight: "44px",
                  }}
                >
                  Adicionar
                </button>
              </div>
            )}
          </div>

          {/* Submit */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
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
                border: "none",
                cursor: saving ? "not-allowed" : "pointer",
                minHeight: "44px",
              }}
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </button>

            {saveSuccess && (
              <p role="status" aria-live="polite" style={{ fontSize: "14px", color: "#15803D", margin: 0 }}>
                Destino atualizado com sucesso.
              </p>
            )}

            {saveError && (
              <p role="alert" aria-live="assertive" style={{ fontSize: "14px", color: "#DC2626", margin: 0 }}>
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
