import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import { getSystemSettings } from '@/lib/system-settings'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  fallback: ['system-ui', 'arial']
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSystemSettings()
  
  return {
    title: settings.systemName,
    description: settings.description || '顧客管理システム',
    icons: settings.faviconUrl ? {
      icon: settings.faviconUrl,
      apple: settings.faviconUrl,
    } : undefined,
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSystemSettings()
  
  return (
    <html lang="ja">
      <head>
        <style>{`
          :root {
            --primary-color: ${settings.primaryColor};
            --secondary-color: ${settings.secondaryColor};
          }
        `}</style>
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}