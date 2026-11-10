"use client"

import { useRef, useState, type ReactNode } from "react"
import { Camera, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { compressImage } from "@/lib/compress-image"
import { Avatar, Button } from "@/src/components/ui/capi"

export type PhotoFolder = "avatars" | "logos" | "guides"

type Props = {
  name?: string | null
  src?: string | null
  folder: PhotoFolder
  /** Recebe a URL nova (ou null ao remover). Pode salvar direto na API; se lançar, o erro vira toast. */
  onChange: (url: string | null) => void | Promise<void>
  size?: number
  /** Ex.: "foto", "logo" — usado nos rótulos dos botões. */
  noun?: string
  disabled?: boolean
  verified?: boolean
  /** Conteúdo ao lado do avatar, acima dos botões (ex.: nome e e-mail). */
  children?: ReactNode
}

async function uploadPhoto(file: File, folder: PhotoFolder): Promise<string> {
  const toSend = await compressImage(file)
  const data = new FormData()
  data.append("file", toSend, toSend.name)
  const res = await fetch(`/api/uploads/photos?folder=${folder}`, { method: "POST", body: data })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.url) throw new Error(body?.message ?? "Falha ao enviar a imagem.")
  return body.url as string
}

/** Avatar com botões "Trocar" e "Remover": envia a imagem para /api/uploads/photos e devolve a URL. */
export function AvatarPicker({ name, src, folder, onChange, size = 80, noun = "foto", disabled, verified, children }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar a imagem.")
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Formato inválido. Use JPEG, PNG ou WebP.")
      e.target.value = ""
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.")
      e.target.value = ""
      return
    }
    void run(async () => {
      const url = await uploadPhoto(file, folder)
      await onChange(url)
    })
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
      <Avatar name={name} src={src} size={size} verified={verified} />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", minWidth: 0 }}>
        {children}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            iconLeft={Camera}
            loading={busy}
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {src ? `Trocar ${noun}` : `Enviar ${noun}`}
          </Button>
          {src ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              iconLeft={Trash2}
              disabled={disabled || busy}
              onClick={() => void run(async () => { await onChange(null) })}
            >
              Remover {noun}
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={src ? `Trocar ${noun}` : `Enviar ${noun}`}
        style={{ display: "none" }}
        onChange={handleFile}
        disabled={disabled || busy}
      />
    </div>
  )
}
