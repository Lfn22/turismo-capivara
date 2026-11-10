"use client"
import { LogIn } from "lucide-react"
import { useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { Button } from "@/src/components/ui/capi"

/** "Entrar" só para quem não tem sessão; com sessão a UserBar já cuida da conta. */
export default function PublicNavLogin() {
  const { status } = useSession()
  const pathname = usePathname()
  if (status !== "unauthenticated") return null
  return (
    <Button href={`/login?callbackUrl=${encodeURIComponent(pathname || "/")}`} variant="secondary" size="sm" iconLeft={LogIn}>
      Entrar
    </Button>
  )
}
