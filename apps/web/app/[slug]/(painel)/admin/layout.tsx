import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

/** Gestão de guias da agência: o layout do painel já exige login; aqui só ADMIN passa. */
export default async function AdminOnlyLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "ADMIN") {
    redirect(`/${slug}/painel/dashboard`)
  }
  return <>{children}</>
}
