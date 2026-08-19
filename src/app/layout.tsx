import type { Metadata, Viewport } from 'next'
import { PwaRegister } from '@/components/PwaRegister'
import './globals.css'

export const metadata: Metadata = {
  title: 'Backlog',
  description: 'Capture and surface movie, show, and book recommendations.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Backlog',
  },
}

export const viewport: Viewport = {
  themeColor: '#121014',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-svh bg-page text-fg antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
