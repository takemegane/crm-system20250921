'use client'

import { SessionProvider } from 'next-auth/react'
import { SystemSettingsProvider } from '@/contexts/SystemSettingsContext'

interface ProvidersProps {
  children: React.ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <SystemSettingsProvider>
        {children}
      </SystemSettingsProvider>
    </SessionProvider>
  )
}