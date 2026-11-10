import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { ContaClient } from "./ContaClient"

export const metadata = { title: "Minha conta" }

export default async function ContaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login?callbackUrl=/conta")

  return (
    <main className="capi-container capi-container--text" style={{ paddingBlock: "var(--space-8)" }}>
      <ContaClient />
    </main>
  )
}
