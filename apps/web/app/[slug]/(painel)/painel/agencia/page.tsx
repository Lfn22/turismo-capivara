import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AgenciaClient } from "./AgenciaClient"

export const metadata = { title: "Agência" }

export default async function AgenciaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") redirect(`/${slug}/painel/dashboard`)
  return <AgenciaClient slug={slug} />
}
