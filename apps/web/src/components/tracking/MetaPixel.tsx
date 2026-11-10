'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { initMetaPixel, isPixelAllowedPath, trackPixel } from '../../lib/meta-pixel'

function hasConsent(): boolean {
  try {
    return localStorage.getItem('capi-cookie-consent') === 'accepted'
  } catch {
    return false
  }
}

export function MetaPixel() {
  const pathname = usePathname()
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID

  useEffect(() => {
    if (!pixelId || !hasConsent() || !isPixelAllowedPath(pathname ?? '')) return
    initMetaPixel(pixelId)
    trackPixel('PageView')
  }, [pixelId, pathname])

  return null
}
