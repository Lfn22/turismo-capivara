'use client'

import React, { useCallback, useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { IconButton } from '@/src/components/ui/capi'

interface PhotoUploadAreaProps {
  photos: string[]
  onAdd: (file: File) => Promise<void>
  onRemove: (url: string) => void
  maxPhotos?: number
}

export function PhotoUploadArea({
  photos,
  onAdd,
  onRemove,
  maxPhotos = 5,
}: PhotoUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error('Formato inválido. Use JPEG, PNG ou WebP.')
        return
      }

      if (file.size > 5242880) {
        toast.error('Arquivo muito grande. Máximo 5MB.')
        return
      }

      setIsUploading(true)
      try {
        await onAdd(file)
        toast.success('Foto adicionada com sucesso.')
      } catch {
        toast.error('Falha ao fazer upload. Tente novamente.')
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [onAdd],
  )

  return (
    <div className="pua">
      <style precedence="default">{`
        .pua__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
          gap: var(--space-2);
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .pua__tile {
          position: relative;
          aspect-ratio: 1 / 1;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--bg-muted);
        }
        .pua__tile img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pua__remove {
          position: absolute;
          top: var(--space-1);
          right: var(--space-1);
        }
        .pua__add {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-1);
          width: 100%;
          aspect-ratio: 1 / 1;
          min-height: var(--touch-target, 44px);
          padding: var(--space-2);
          border: 2px dashed var(--border-strong);
          border-radius: var(--radius-sm);
          background: var(--bg-subtle);
          color: var(--text-secondary);
          font: 600 13px/1.3 var(--font-sans);
          text-align: center;
          cursor: pointer;
          transition: border-color .15s ease, color .15s ease, background-color .15s ease;
        }
        .pua__add:hover {
          border-color: var(--primary);
          color: var(--text-primary);
          background: var(--primary-subtle);
        }
        .pua__add:focus-visible {
          outline: 2px solid var(--focus-ring);
          outline-offset: 2px;
        }
        .pua__uploading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
          aspect-ratio: 1 / 1;
          border-radius: var(--radius-sm);
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          color: var(--text-secondary);
          font: 500 12px/1.3 var(--font-sans);
        }
        .pua__count {
          margin: var(--space-2) 0 0;
          font-size: 13px;
          color: var(--text-secondary);
        }
      `}</style>

      <ul className="pua__grid">
        {photos.map((url, idx) => (
          <li key={url + idx} className="pua__tile">
            {/* eslint-disable-next-line @next/next/no-img-element -- URLs de upload de hosts variados */}
            <img src={url} alt={`Foto ${idx + 1}`} />
            <IconButton
              icon={X}
              label={`Remover foto ${idx + 1}`}
              variant="glass"
              size="sm"
              className="pua__remove"
              onClick={() => onRemove(url)}
            />
          </li>
        ))}

        {photos.length < maxPhotos && !isUploading && (
          <li>
            <button
              type="button"
              className="pua__add"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus size={22} strokeWidth={1.75} aria-hidden="true" />
              Adicionar foto
            </button>
          </li>
        )}

        {isUploading && (
          <li className="pua__uploading" role="status" aria-live="polite">
            <span className="capi-spinner" aria-hidden="true" />
            Enviando…
          </li>
        )}
      </ul>

      <p className="pua__count">
        {photos.length}/{maxPhotos} fotos · JPEG, PNG ou WebP até 5MB
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={isUploading}
      />
    </div>
  )
}
