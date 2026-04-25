import type { Metadata } from 'next'
import { Chakra_Petch, Space_Grotesk, Space_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  variable: '--font-display',
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: '--font-body',
  weight: ["300", "400", "500", "600", "700"],
  display: 'swap',
})

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: '--font-mono',
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Where Are The Women? | Gender Gap in Open Source AI',
  description: 'An interactive data journalism exploration of gender representation among top contributors on GitHub and Hugging Face.',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${chakraPetch.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`}>
      <body className="antialiased bg-transparent">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
