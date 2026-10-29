"use client"
import { SessionProvider } from "next-auth/react"
import { UserBar } from "@/src/components/layout/UserBar"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserBar />
      {children}
    </SessionProvider>
  )
}
