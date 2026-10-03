import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Toaster } from "sonner"
import SuperAdminNav from "./SuperAdminNav"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if ((session.user as any).role !== "SUPER_ADMIN") {
    redirect("/login?error=forbidden")
  }

  return (
    <div className="min-h-dvh bg-page md:flex">
      <SuperAdminNav userName={session.user?.name} userEmail={session.user?.email} />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="mx-auto w-full" style={{ maxWidth: "var(--container-wide)" }}>
          {children}
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  )
}
