import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const raptorSans = localFont({
  src: '../public/fonts/raptor-sans.ttf',
  variable: '--font-raptor',
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
    <html lang="en" className={`${raptorSans.variable}`}>
      <body className="font-sans antialiased bg-transparent">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
