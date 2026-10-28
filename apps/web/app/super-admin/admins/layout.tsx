import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/super-admin/operadoras")
  }
  return <>{children}</>
}
