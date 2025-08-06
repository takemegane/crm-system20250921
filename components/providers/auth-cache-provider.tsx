'use client'

import { useAuthCache } from '@/hooks/use-auth-cache'

interface AuthCacheProviderProps {
  children: React.ReactNode
}

/**
 * 認証状態の変更を監視してキャッシュを適切に管理するプロバイダー
 */
export default function AuthCacheProvider({ children }: AuthCacheProviderProps) {
  // 認証状態の変更を監視
  useAuthCache()

  return <>{children}</>
}