"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import BackButton from "@/src/components/ui/BackButton"
import { PhotoUploadArea } from "@/src/components/ui/PhotoUploadArea"
import { MapPin, ShieldCheck } from "lucide-react"
import { Alert, Avatar, Badge, Button, Input, PageHeader, Skeleton, Textarea } from "@/src/components/ui/capi"

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

  const isApproved = profile?.user?.approvalStatus === "APPROVED"
  const approvalStatus = profile?.user?.approvalStatus
  const approvalAlert =
    approvalStatus === "APPROVED"
      ? { tone: "success" as const, title: "Perfil aprovado", text: "Seu perfil está visível para os turistas no marketplace." }
      : approvalStatus === "REJECTED"
      ? { tone: "danger" as const, title: "Perfil não aprovado", text: "Revise suas informações e fale com o suporte para uma nova análise." }
      : approvalStatus
      ? { tone: "warning" as const, title: "Perfil em análise", text: "Enquanto a equipe revisa seu cadastro, complete a bio, as especialidades e o portfólio." }
      : null

  const parseList = (value: string) =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  const especialidadesList = parseList(especialidades)
  const regioesList = parseList(regioes)

  return (
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <style precedence="default">{`
        .perfil-id {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
          padding: var(--space-5);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--surface);
          font-family: var(--font-sans);
        }
        .perfil-id__name { margin: 0; font-size: 18px; font-weight: 600; line-height: 1.3; color: var(--text); overflow-wrap: anywhere; }
        .perfil-id__email { margin: 2px 0 0; font-size: 14px; color: var(--text-secondary); overflow-wrap: anywhere; }
        .perfil-id__badge { margin-top: var(--space-2); }
        .perfil-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
          padding-bottom: calc(var(--space-20) + var(--space-4));
          font-family: var(--font-sans);
        }
        @media (min-width: 768px) { .perfil-form { padding-bottom: 0; } }
        .perfil-section { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }
        .perfil-section + .perfil-section { padding-top: var(--space-8); border-top: 1px solid var(--border); }
        .perfil-head { display: flex; flex-direction: column; gap: var(--space-1); }
        .perfil-title { margin: 0; font-size: 18px; font-weight: 600; line-height: 1.35; color: var(--text); }
        .perfil-desc { margin: 0; font-size: 14px; line-height: 1.5; color: var(--text-secondary); }
        .perfil-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: calc(var(--space-2) * -1); }
        .perfil-bar {
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
        .perfil-bar .capi-btn { flex: 1; }
        @media (min-width: 768px) {
          .perfil-bar {
            position: static;
            justify-content: flex-end;
            padding: var(--space-6) 0 0;
            background: transparent;
            box-shadow: none;
          }
          .perfil-bar .capi-btn { flex: 0 0 auto; }
        }
      `}</style>

      <BackButton fallbackHref={slug ? `/${slug}/painel` : "/"} />

      <PageHeader
        eyebrow="Painel do guia"
        title="Meu perfil"
        description="Como os turistas veem você na sua página de guia."
      />

      {loading ? (
        <div aria-busy="true">
          <div className="perfil-id">
            <Skeleton width={80} height={80} radius={999} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <Skeleton width="60%" height={18} />
              <Skeleton width="40%" height={14} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <Skeleton width={120} height={14} />
                <Skeleton height={48} radius={12} />
              </div>
            ))}
          </div>
        </div>
      ) : loadError ? (
        <Alert tone="danger" title="Não foi possível carregar seu perfil">
          Recarregue a página para tentar de novo.
        </Alert>
      ) : (
        <>
          <div className="perfil-id">
            <Avatar name={profile?.user?.name} src={profile?.photoUrl} size={80} verified={isApproved} />
            <div style={{ minWidth: 0 }}>
              <p className="perfil-id__name">{profile?.user?.name || "Guia"}</p>
              {profile?.user?.email ? <p className="perfil-id__email">{profile.user.email}</p> : null}
              {/* GUIDE-02: Badge de guia verificado */}
              {isApproved && (
                <div className="perfil-id__badge">
                  <Badge tone="brand" icon={ShieldCheck} title="Guia verificado pela plataforma">
                    Guia verificado
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {approvalAlert && (
            <Alert tone={approvalAlert.tone} title={approvalAlert.title} className="mb-8">
              {approvalAlert.text}
            </Alert>
          )}

          <form onSubmit={handleSave} className="perfil-form">
            <section className="perfil-section">
              <div className="perfil-head">
                <h2 className="perfil-title">Dados pessoais</h2>
                <p className="perfil-desc">Para alterar estes dados, fale com o suporte.</p>
              </div>

              <Input
                label="Nome"
                type="text"
                value={profile?.user?.name ?? ""}
                readOnly
                disabled
              />

              {profile?.user &&
                "cpf" in profile.user &&
                profile.user.cpf && (
                  <Input
                    label="CPF / CNPJ"
                    type="text"
                    value={String(profile.user.cpf)}
                    readOnly
                    disabled
                  />
                )}
            </section>

            <section className="perfil-section">
              <div className="perfil-head">
                <h2 className="perfil-title">Sobre você</h2>
                <p className="perfil-desc">Sua experiência, o que gosta de mostrar e por que guia.</p>
              </div>

              <Textarea
                id="bio"
                label="Bio"
                optional
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                placeholder="Conte sua história como guia…"
              />
            </section>

            <section className="perfil-section">
              <div className="perfil-head">
                <h2 className="perfil-title">Especialidades e regiões</h2>
                <p className="perfil-desc">Ajudam o turista a encontrar o guia certo para o passeio.</p>
              </div>

              <Input
                id="especialidades"
                label="Especialidades"
                optional
                type="text"
                value={especialidades}
                onChange={(e) => setEspecialidades(e.target.value)}
                placeholder="Ex.: arqueologia, trilha, fotografia"
                hint="Separe com vírgulas."
              />
              {especialidadesList.length > 0 && (
                <div className="perfil-tags" aria-label="Especialidades informadas">
                  {especialidadesList.map((item, i) => (
                    <Badge key={`${item}-${i}`}>{item}</Badge>
                  ))}
                </div>
              )}

              <Input
                id="regioes"
                label="Regiões atendidas"
                optional
                type="text"
                value={regioes}
                onChange={(e) => setRegioes(e.target.value)}
                placeholder="Ex.: Serra da Capivara, Piauí"
                hint="Separe com vírgulas."
              />
              {regioesList.length > 0 && (
                <div className="perfil-tags" aria-label="Regiões informadas">
                  {regioesList.map((item, i) => (
                    <Badge key={`${item}-${i}`} icon={MapPin}>{item}</Badge>
                  ))}
                </div>
              )}
            </section>

            {/* Portfólio de Fotos (GUIDE-04) */}
            <section className="perfil-section">
              <div className="perfil-head">
                <h2 className="perfil-title">Portfólio de fotos</h2>
                <p className="perfil-desc">Até 5 fotos dos seus passeios, com até 5MB cada.</p>
              </div>
              <PhotoUploadArea
                photos={portfolioPhotos}
                onAdd={handleUploadPhoto}
                onRemove={handleRemovePhoto}
                maxPhotos={5}
              />
            </section>

            {saveSuccess && <Alert tone="success">Perfil atualizado com sucesso.</Alert>}
            {saveError && (
              <Alert tone="danger" title="Não foi possível salvar">
                {saveError}
              </Alert>
            )}

            <div className="perfil-bar">
              <Button type="submit" loading={saving}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
