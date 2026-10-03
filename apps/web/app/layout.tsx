import type { Metadata, Viewport } from "next"
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

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
      <body className="antialiased"><Providers>{children}</Providers></body>
    </html>
  )
}
