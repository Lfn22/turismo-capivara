import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function TuristaRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const role = (session.user as any)?.role
  if (role !== 'CLIENTE') {
    const slug = (session.user as any)?.tenantSlug
    redirect(slug ? `/${slug}/painel` : '/')
  }

  return <>{children}</>
}
