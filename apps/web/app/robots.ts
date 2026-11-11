import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://capi.turismo.com.br'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/super-admin/', '/pendencias'],
      },
      {
        userAgent: '*',
        disallow: ['/*/painel/', '/*/admin/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
