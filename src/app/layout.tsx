import './globals.css'
import Script from 'next/script'
import Providers from '@/components/ui/Providers'

export const metadata = {
  title: 'Check-In',
  description: '나만의 AI 인테리어 비서 — 현장 관리 플랫폼',
  manifest: '/manifest.json',
  themeColor: '#0F2744',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Check-In',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Check-In" />
        <meta name="theme-color" content="#0F2744" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(err) {
                  console.log('SW registration failed:', err);
                });
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
