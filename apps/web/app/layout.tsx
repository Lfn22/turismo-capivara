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
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${sourceSans.variable}`} style={{ backgroundColor: 'var(--stone-50)' }}>
      <body className="antialiased" style={{ backgroundColor: 'var(--stone-50)' }}>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  )
}