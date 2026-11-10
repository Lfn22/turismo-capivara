'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { parseUtm, saveUtm } from '@/src/lib/utm'

export function UtmCapture() {
  const searchParams = useSearchParams()

  useEffect(() => {
    saveUtm(parseUtm(searchParams.toString()))
  }, [searchParams])

  return null
}
