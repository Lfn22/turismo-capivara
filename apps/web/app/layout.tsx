import type { Metadata, Viewport } from "next"
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { Suspense } from "react"
import { Providers } from "./providers"
import { PostHogProvider } from "@/src/components/providers/PostHogProvider"

// Interface: Plus Jakarta Sans. Momentos de marca (hero, nome de destino): Playfair Display.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-playfair",
  display: "swap",
})

export const metadata: Metadata = {
  title: { template: '%s | CAPI', default: 'CAPI' },
  description: 'Encontre guias certificados, compare roteiros e reserve com PIX.',
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: 'CAPI',
    title: 'CAPI — Guias de Turismo',
    description: 'caminho entre quem explora e quem opera',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'CAPI — Guias de Turismo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CAPI — Guias de Turismo',
    description: 'caminho entre quem explora e quem opera',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
}

export const viewport: Viewport = {
  themeColor: "#f7f5f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" data-theme="light" className={`${jakarta.variable} ${playfair.variable}`}>
      <body className="antialiased">
        <Providers>
          <Suspense fallback={null}>
            <PostHogProvider>{children}</PostHogProvider>
          </Suspense>
        </Providers>
      </body>
    </html>
  )
}
