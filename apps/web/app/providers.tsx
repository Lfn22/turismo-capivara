'use client'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import { EditModeProvider } from '@/src/components/edit-mode/EditModeProvider'
import { EditModeBanner } from '@/src/components/edit-mode/EditModeBanner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <EditModeProvider>
        <EditModeBanner />
        {children}
        <Toaster position="top-center" richColors />
      </EditModeProvider>
    </SessionProvider>
  )
}
