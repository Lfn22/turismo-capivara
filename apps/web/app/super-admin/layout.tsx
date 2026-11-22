import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SuperAdminNav from './SuperAdminNav'
import { isPlatformStaff } from '@/lib/roles'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  if (!isPlatformStaff(session.user.role)) {
    redirect('/login?error=forbidden')
  }

  return (
    <div className="min-h-dvh bg-page md:flex">
      <SuperAdminNav
        userName={session.user?.name}
        userEmail={session.user?.email}
        role={session.user.role}
      />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="mx-auto w-full" style={{ maxWidth: 'var(--container-wide)' }}>
          {children}
        </div>
      </main>
    </div>
  )
}
