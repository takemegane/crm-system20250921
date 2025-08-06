'use client'

import { SessionProvider } from 'next-auth/react'
import { SystemSettingsProvider } from '@/contexts/SystemSettingsContext'
import QueryProvider from '@/components/providers/query-provider'
import AuthCacheProvider from '@/components/providers/auth-cache-provider'

interface ProvidersProps {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <QueryProvider>
        <AuthCacheProvider>
          <SystemSettingsProvider>
            {children}
          </SystemSettingsProvider>
        </AuthCacheProvider>
      </QueryProvider>
    </SessionProvider>
  )
}