'use client'

import React, { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

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
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        {photos.map((url, idx) => (
          <div
            key={url + idx}
            style={{
              position: 'relative',
              width: '80px',
              height: '80px',
              borderRadius: '4px',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Foto ${idx + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <button
              type="button"
              onClick={() => onRemove(url)}
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.65)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                lineHeight: 1,
                padding: 0,
                /* expand touch target without affecting layout */
                minHeight: '44px',
                minWidth: '44px',
                margin: '-12px -12px 0 0',
              }}
              aria-label="Remover foto"
            >
              ×
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && !isUploading && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '80px',
              height: '80px',
              border: '2px dashed var(--stone-300, #d6d3d1)',
              background: 'var(--stone-50, #fafaf9)',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: 'var(--stone-400, #a8a29e)',
              padding: 0,
              flexShrink: 0,
            }}
            aria-label="Adicionar foto"
          >
            +
          </button>
        )}

        {isUploading && (
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '4px',
              background: 'var(--stone-100, #f5f5f4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              color: 'var(--stone-500, #78716c)',
              flexShrink: 0,
            }}
          >
            Enviando...
          </div>
        )}
      </div>

      {photos.length >= maxPhotos && (
        <p style={{ fontSize: '12px', color: 'var(--stone-500, #78716c)', margin: '4px 0 0' }}>
          {photos.length}/{maxPhotos} fotos adicionadas
        </p>
      )}

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
