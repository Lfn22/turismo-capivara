import type { Metadata } from "next"
import { Playfair_Display, Source_Sans_3 } from "next/font/google"
import "./globals.css"

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
  title: "Serra da Capivara — Patrimônio Mundial UNESCO",
  description: "Explore os sítios arqueológicos mais antigos das Américas com condutores credenciados pelo ICMBio.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${playfair.variable} ${sourceSans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}