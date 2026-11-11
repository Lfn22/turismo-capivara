import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://capi.turismo.com.br'
const API_URL = process.env.API_URL ?? 'http://localhost:3333'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    {
      url: `${BASE_URL}/destinos`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/explorar`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/termos`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/politica-privacidade`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  try {
    const res = await fetch(`${API_URL}/destinations`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const destinations = (data.items ?? data ?? []) as Array<{ slug: string; updatedAt?: string }>
      const destinationRoutes: MetadataRoute.Sitemap = destinations.map((d) => ({
        url: `${BASE_URL}/destinos/${d.slug}`,
        lastModified: d.updatedAt ? new Date(d.updatedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
      return [...staticRoutes, ...destinationRoutes]
    }
  } catch {
    // API unavailable — return static routes only
  }

  return staticRoutes
}
