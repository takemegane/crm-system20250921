import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * 認証状態の変更を監視し、必要に応じてキャッシュをクリアする
 */
export function useAuthCache() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()

  useEffect(() => {
    // セッション状態が変更された場合の処理
    if (status === 'loading') {
      // ローディング中は何もしない
      return
    }

    if (status === 'unauthenticated') {
      // ログアウト時は全キャッシュをクリア
      console.log('🔄 Clearing all cache due to logout')
      queryClient.clear()
      return
    }

    if (session?.user) {
      // ユーザータイプに応じて不適切なキャッシュをクリア
      const userType = session.user.userType
      
      if (userType === 'customer') {
        // 顧客の場合、管理者専用のキャッシュをクリア
        console.log('🔄 Clearing admin-only cache for customer user')
        queryClient.removeQueries({ queryKey: ['customers'] })
        queryClient.removeQueries({ queryKey: ['orders', { isAdmin: true }] })
        queryClient.removeQueries({ queryKey: ['users'] })
        queryClient.removeQueries({ queryKey: ['audit-logs'] })
      } else if (userType === 'admin') {
        // 管理者の場合、顧客専用のキャッシュをクリア
        console.log('🔄 Clearing customer-only cache for admin user')
        queryClient.removeQueries({ queryKey: ['cart'] })
        queryClient.removeQueries({ queryKey: ['orders', { isCustomer: true }] })
      }
    }
  }, [session, status, queryClient])

  return { session, status }
}

/**
 * セッション切れを検出してキャッシュをクリアする
 */
export function useSessionExpiredHandler() {
  const queryClient = useQueryClient()

  const handleSessionExpired = () => {
    console.log('🔄 Session expired, clearing all cache')
    queryClient.clear()
    // ログインページへリダイレクト
    window.location.href = '/login'
  }

  return { handleSessionExpired }
}