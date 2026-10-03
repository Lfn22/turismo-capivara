"use client"
import { useState, useEffect } from "react"
import BackButton from "@/src/components/ui/BackButton"
import { ImagePlus, Link2, Plus, Trash2 } from "lucide-react"
import { Alert, Button, IconButton, Input, PageHeader, Skeleton, Textarea } from "@/src/components/ui/capi"

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

  return (
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <style precedence="default">{`
        .mdest-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
          padding-bottom: calc(var(--space-20) + var(--space-4));
          font-family: var(--font-sans);
        }
        @media (min-width: 768px) { .mdest-form { padding-bottom: 0; } }
        .mdest-section { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }
        .mdest-section + .mdest-section { padding-top: var(--space-8); border-top: 1px solid var(--border); }
        .mdest-head { display: flex; flex-direction: column; gap: var(--space-1); }
        .mdest-title { margin: 0; font-size: 18px; font-weight: 600; line-height: 1.35; color: var(--text); }
        .mdest-desc { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-secondary); }
        .mdest-row { display: flex; align-items: flex-start; gap: var(--space-2); }
        .mdest-row > :first-child { flex: 1; min-width: 0; }
        /* alinha o botão ao campo: rótulo (14px × 1,4) + gap 6px + (48px − 44px) / 2 */
        .mdest-row > .capi-iconbtn, .mdest-row > .capi-btn { flex: none; margin-top: calc(14px * 1.4 + 6px + 2px); }
        .mdest-photos { display: flex; flex-direction: column; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
        .mdest-photo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-2);
          padding-right: var(--space-1);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--surface);
        }
        .mdest-photo__thumb {
          width: 56px;
          height: 56px;
          flex: none;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--bg-muted);
        }
        .mdest-photo__thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .mdest-photo__url {
          flex: 1;
          min-width: 0;
          font-size: 14px;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
        }
        .mdest-bar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: calc(var(--bottombar-height) + env(safe-area-inset-bottom, 0px));
          z-index: var(--z-sticky);
          display: flex;
          padding: var(--space-3) var(--space-4);
          background: var(--surface);
          border-top: 1px solid var(--border);
          box-shadow: var(--shadow-md);
        }
        .mdest-bar .capi-btn { flex: 1; }
        @media (min-width: 768px) {
          .mdest-bar {
            position: static;
            justify-content: flex-end;
            padding: var(--space-6) 0 0;
            background: transparent;
            box-shadow: none;
          }
          .mdest-bar .capi-btn { flex: 0 0 auto; }
        }
      `}</style>

      <BackButton fallbackHref={slug ? `/${slug}/painel` : '/'} />

      <PageHeader
        eyebrow="Painel do guia"
        title="Meu destino"
        description="Textos e imagens da página pública do seu destino."
      />

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Skeleton width={120} height={14} />
              <Skeleton height={48} radius={12} />
            </div>
          ))}
          <Skeleton height={140} radius={12} />
        </div>
      ) : loadError ? (
        <Alert tone="danger" title="Não foi possível carregar seu destino">
          Recarregue a página para tentar de novo.
        </Alert>
      ) : (
        <form onSubmit={handleSave} className="mdest-form">
          {/* Textos */}
          <section className="mdest-section">
            <div className="mdest-head">
              <h2 className="mdest-title">Textos</h2>
              <p className="mdest-desc">O que o turista lê no topo e na apresentação do destino.</p>
            </div>

            <Input
              label="Frase de impacto"
              optional
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Ex.: A natureza que cura quem chega"
            />

            <Input
              label="Título"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <Input
              label="Subtítulo"
              optional
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Frase curta de apoio"
            />

            <Textarea
              label="Descrição"
              optional
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              hint="Separe parágrafos com uma linha em branco."
            />
          </section>

          {/* Destaques */}
          <section className="mdest-section">
            <div className="mdest-head">
              <h2 className="mdest-title">Pontos de interesse</h2>
              <p className="mdest-desc">Um por campo. Eles aparecem nos cards do destino.</p>
            </div>

            {highlights.map((h, i) => (
              <div key={i} className="mdest-row">
                <Input
                  label={`Ponto ${i + 1}`}
                  value={h}
                  onChange={(e) => setHighlight(i, e.target.value)}
                  placeholder={`Ponto ${i + 1}`}
                />
                <IconButton
                  icon={Trash2}
                  label={`Remover ponto ${i + 1}`}
                  variant="ghost"
                  onClick={() => removeHighlight(i)}
                />
              </div>
            ))}

            <div>
              <Button variant="secondary" size="sm" iconLeft={Plus} onClick={addHighlight}>
                Adicionar ponto
              </Button>
            </div>
          </section>

          {/* Imagens */}
          <section className="mdest-section">
            <div className="mdest-head">
              <h2 className="mdest-title">Imagens</h2>
              <p className="mdest-desc">Use links públicos (https://) das fotos.</p>
            </div>

            <Input
              label="Imagem principal (capa)"
              optional
              type="url"
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              placeholder="https://exemplo.com/capa.jpg"
              leadingIcon={Link2}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className="mdest-head">
                <p className="mdest-title" style={{ fontSize: 14 }}>Galeria de fotos</p>
                <p className="mdest-desc">{photos.length}/5 fotos</p>
              </div>

              {photos.length > 0 && (
                <ul className="mdest-photos">
                  {photos.map((url, idx) => (
                    <li key={idx} className="mdest-photo">
                      <span className="mdest-photo__thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element -- URLs externas informadas pelo guia */}
                        <img src={url} alt="" />
                      </span>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="mdest-photo__url">
                        {url}
                      </a>
                      <IconButton
                        icon={Trash2}
                        label={`Remover foto ${idx + 1}`}
                        variant="ghost"
                        onClick={() => removePhoto(idx)}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {photos.length < 5 && (
                <div className="mdest-row">
                  <Input
                    label="Link da nova foto"
                    type="url"
                    value={newPhoto}
                    onChange={(e) => {
                      setNewPhoto(e.target.value)
                      setPhotoError(null)
                    }}
                    placeholder="https://exemplo.com/foto.jpg"
                    leadingIcon={ImagePlus}
                    error={photoError}
                  />
                  <Button variant="secondary" iconLeft={Plus} onClick={addPhoto}>
                    Adicionar
                  </Button>
                </div>
              )}
            </div>
          </section>

          {saveSuccess && (
            <Alert tone="success">Destino atualizado com sucesso.</Alert>
          )}
          {saveError && (
            <Alert tone="danger" title="Não foi possível salvar">
              {saveError}
            </Alert>
          )}

          <div className="mdest-bar">
            <Button type="submit" loading={saving}>
              {saving ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
