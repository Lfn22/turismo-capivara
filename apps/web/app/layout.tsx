import type { Metadata } from "next"
import { Playfair_Display, Source_Sans_3 } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import Header from "@/src/components/layout/Header"
import Footer from "@/src/components/layout/Footer"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
})

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${sourceSans.variable}`} style={{ backgroundColor: 'var(--color-bg)' }}>
      <body className="antialiased" style={{ backgroundColor: 'var(--color-bg)' }}>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}