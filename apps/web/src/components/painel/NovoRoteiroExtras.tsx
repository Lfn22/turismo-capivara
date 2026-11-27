'use client'
import { Plus, X } from 'lucide-react'
import { Button, IconButton, Input } from '@/src/components/ui/capi'
import { PhotoUploadArea } from '@/src/components/ui/PhotoUploadArea'
import { uploadPackagePhoto } from '@/lib/upload-package-photo'
import PainelCard from './PainelCard'

export const MAX_PHOTOS = 5
export const MAX_HIGHLIGHTS = 10

/** Cards "Fotos" e "Destaques" do formulário de novo roteiro. */
export default function NovoRoteiroExtras({
  photos,
  highlights,
  onPhotosChange,
  onHighlightsChange,
}: {
  photos: string[]
  highlights: string[]
  onPhotosChange: (photos: string[]) => void
  onHighlightsChange: (highlights: string[]) => void
}) {
  return (
    <>
      <PainelCard title="Fotos">
        <PhotoUploadArea
          photos={photos}
          maxPhotos={MAX_PHOTOS}
          onAdd={async (file) => {
            const url = await uploadPackagePhoto(file)
            onPhotosChange([...photos, url])
          }}
          onRemove={(url) => onPhotosChange(photos.filter((p) => p !== url))}
        />
      </PainelCard>

      <PainelCard title="Destaques">
        <div className="flex flex-col gap-2">
          {highlights.map((h, i) => (
            <div key={i} className="flex items-end gap-2">
              <Input
                label={`Destaque ${i + 1}`}
                hideLabel
                value={h}
                onChange={(e) =>
                  onHighlightsChange(highlights.map((x, idx) => (idx === i ? e.target.value : x)))
                }
                className="flex-1"
              />
              <IconButton
                icon={X}
                label={`Remover destaque ${i + 1}`}
                onClick={() => onHighlightsChange(highlights.filter((_, idx) => idx !== i))}
              />
            </div>
          ))}
          {highlights.length < MAX_HIGHLIGHTS ? (
            <Button
              variant="secondary"
              size="sm"
              iconLeft={Plus}
              onClick={() => onHighlightsChange([...highlights, ''])}
            >
              Adicionar destaque
            </Button>
          ) : null}
        </div>
      </PainelCard>
    </>
  )
}
