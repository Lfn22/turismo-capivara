'use client'

import { useEffect } from 'react'
import { posthog } from '@/src/lib/posthog'

export function TrackView({ event, properties }: { event: string; properties: Record<string, unknown> }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
    posthog.capture(event, properties)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
