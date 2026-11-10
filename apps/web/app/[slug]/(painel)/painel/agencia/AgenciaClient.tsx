"use client"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Alert, Button, Input, PageHeader, Skeleton } from "@/src/components/ui/capi"
import { AvatarPicker } from "@/src/components/ui/AvatarPicker"
import { editCall, errorText } from "@/lib/edit-client"
import { normalizeWhatsapp } from "@/src/lib/whatsapp"

interface TenantSettings {
  id: string
  slug: string
  name: string
  whatsapp: string | null
  logoUrl: string | null
  type: string
}

export function AgenciaClient({ slug }: { slug: string }) {
  const path = `/api/proxy?path=${encodeURIComponent(`/tenants/${slug}/settings`)}`
  const [settings, setSettings] = useState<TenantSettings | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [name, setName] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [whatsappError, setWhatsappError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    editCall("GET", path)
      .then(({ ok, data }) => {
        if (!ok || !data) return setLoadError(true)
        setSettings(data)
        setName(data.name ?? "")
        setWhatsapp(data.whatsapp ?? "")
      })
      .catch(() => setLoadError(true))
  }, [path])

  async function saveLogo(logoUrl: string | null) {
    const { ok, data } = await editCall("PATCH", path, { logoUrl })
    if (!ok) throw new Error(errorText(data, "Não foi possível salvar o logo."))
    setSettings(data)
    toast.success(logoUrl ? "Logo atualizado." : "Logo removido.")
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    const nameErr = trimmed.length < 2 || trimmed.length > 120 ? "O nome deve ter entre 2 e 120 caracteres." : null
    const wa = normalizeWhatsapp(whatsapp)
    setNameError(nameErr)
    setWhatsappError(wa.error)
    setSaveError(null)
    if (nameErr || wa.error) return
    setSaving(true)
    try {
      const { ok, data } = await editCall("PATCH", path, { name: trimmed, whatsapp: wa.value })
      if (!ok) return setSaveError(errorText(data, "Não foi possível salvar os dados da agência."))
      setSettings(data)
      setName(data.name ?? "")
      setWhatsapp(data.whatsapp ?? "")
      toast.success("Dados da agência atualizados.")
    } catch {
      setSaveError("Erro de conexão. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="capi-container capi-container--text" style={{ paddingInline: 0 }}>
      <PageHeader
        eyebrow="Painel da agência"
        title="Dados da agência"
        description="Nome, WhatsApp e logo exibidos nas páginas públicas da agência."
      />

      {loadError ? (
        <Alert tone="danger" title="Não foi possível carregar os dados da agência">
          Recarregue a página para tentar de novo.
        </Alert>
      ) : !settings ? (
        <div aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Skeleton width={80} height={80} radius={999} />
          <Skeleton height={48} radius={12} />
          <Skeleton height={48} radius={12} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", fontFamily: "var(--font-sans)" }}>
          <section aria-labelledby="agencia-logo" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <h2 id="agencia-logo" style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "var(--text)" }}>Logo</h2>
            <AvatarPicker name={settings.name} src={settings.logoUrl} folder="logos" noun="logo" onChange={saveLogo} />
          </section>

          <form onSubmit={handleSave} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Input
              label="Nome da agência"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              error={nameError}
            />
            <Input
              label="WhatsApp"
              optional
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(89) 99999-0000"
              hint="Com DDD. Deixe em branco para não exibir."
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              error={whatsappError}
            />
            <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)" }}>
              Endereço da agência: <strong>/{settings.slug}</strong> (não pode ser alterado).
            </p>
            {saveError && <Alert tone="danger">{saveError}</Alert>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="submit" loading={saving}>
                {saving ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
