import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: '--font-space',
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="en" className={`${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased bg-transparent">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
