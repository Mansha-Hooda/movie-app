import type { Metadata, Viewport } from 'next'
import { PwaRegister } from '@/components/PwaRegister'
import './globals.css'

const APPLE_STARTUP_IMAGES = [
  {
    url: '/splash-640x1136.png',
    media:
      '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
  },
  {
    url: '/splash-750x1334.png',
    media:
      '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
  },
  {
    url: '/splash-828x1792.png',
    media:
      '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
  },
  {
    url: '/splash-1125x2436.png',
    media:
      '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    url: '/splash-1170x2532.png',
    media:
      '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    url: '/splash-1179x2556.png',
    media:
      '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    url: '/splash-1284x2778.png',
    media:
      '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    url: '/splash-1290x2796.png',
    media:
      '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    url: '/splash-1320x2868.png',
    media:
      '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3)',
  },
  {
    url: '/splash-1206x2622.png',
    media:
      '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3)',
  },
]

export const metadata: Metadata = {
  title: 'Backlog',
  description: 'Capture and surface movie, show, and book recommendations.',
  manifest: '/manifest.json?v=6',
  appleWebApp: {
    capable: true,
    title: 'BOOKMARK',
    statusBarStyle: 'black-translucent',
    startupImage: APPLE_STARTUP_IMAGES,
  },
  icons: {
    icon: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#6C00F8',
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
