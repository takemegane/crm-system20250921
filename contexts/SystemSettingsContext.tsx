'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface SystemSettings {
  id: string
  systemName: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor: string
  secondaryColor: string
  description?: string
  isActive: boolean
}

interface SystemSettingsContextType {
  settings: SystemSettings | null
  loading: boolean
  refreshSettings: () => Promise<void>
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined)

const defaultSettings: SystemSettings = {
  id: 'default',
  systemName: 'CRM管理システム',
  primaryColor: '#3B82F6',
  secondaryColor: '#1F2937',
  isActive: true
}

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/system-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      } else {
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error fetching system settings:', error)
      setSettings(defaultSettings)
    } finally {
      setLoading(false)
    }
  }

  const refreshSettings = async () => {
    setLoading(true)
    await fetchSettings()
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // CSS custom properties をリアルタイム更新
  useEffect(() => {
    if (settings) {
      document.documentElement.style.setProperty('--primary-color', settings.primaryColor)
      document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor)
    }
  }, [settings])

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SystemSettingsContext.Provider>
  )
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext)
  if (context === undefined) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider')
  }
  return context
}