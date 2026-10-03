'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/src/components/ui/capi'

export default function BackButton({ fallbackHref = '/' }: { fallbackHref?: string }) {
  const router = useRouter()

  function handleBack() {
    if (window.history.length > 1) router.back()
    else router.push(fallbackHref)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      iconLeft={ArrowLeft}
      onClick={handleBack}
      aria-label="Voltar para página anterior"
      style={{ minHeight: 'var(--touch-target)' }}
    >
      Voltar
    </Button>
  )
}
