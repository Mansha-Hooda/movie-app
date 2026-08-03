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
  themeColor: '#4f46e5',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-svh bg-white text-gray-900 antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  )
}
