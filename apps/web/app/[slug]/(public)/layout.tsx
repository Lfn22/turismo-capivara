import PublicNav from '@/src/components/layout/PublicNav'

const API_URL = process.env.API_URL ?? 'http://localhost:3333'

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let tenantName = slug
  let tenantLogoUrl: string | null = null
  try {
    const res = await fetch(`${API_URL}/tenants/${slug}`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      if (data?.name) tenantName = data.name
      if (typeof data?.logoUrl === 'string') tenantLogoUrl = data.logoUrl
    }
  } catch {
    // fallback to slug
  }

  return (
    <div className="flex flex-col bg-page text-fg" style={{ minHeight: '100dvh' }}>
      <PublicNav tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} slug={slug} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
