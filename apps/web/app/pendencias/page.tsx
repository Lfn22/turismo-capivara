import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { PendenciasList } from "./PendenciasList"

export const metadata = { title: "Pendências" }

export default async function PendenciasPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login?callbackUrl=/pendencias")

  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 16px" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "24px",
          fontWeight: 400,
          color: "var(--stone-900)",
          marginBottom: "24px",
        }}
      >
        Pendências
      </h1>
      <PendenciasList />
    </main>
  )
}
