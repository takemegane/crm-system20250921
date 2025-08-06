import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/**
 * タブ間でのキャッシュ同期を管理する
 */
export function useCrossTabSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    // BroadcastChannel APIを使用したタブ間通信
    if (typeof window === 'undefined' || !window.BroadcastChannel) {
      return
    }

    const channel = new BroadcastChannel('cache-sync')

    // 他のタブからの更新通知を受信
    const handleMessage = (event: MessageEvent) => {
      const { type, queryKey, data } = event.data

      switch (type) {
        case 'CACHE_INVALIDATE':
          // 特定のキャッシュを無効化
          queryClient.invalidateQueries({ queryKey })
          console.log('🔄 Cross-tab cache invalidation:', queryKey)
          break
          
        case 'CACHE_UPDATE':
          // 特定のキャッシュを更新
          queryClient.setQueryData(queryKey, data)
          console.log('🔄 Cross-tab cache update:', queryKey)
          break
          
        case 'CACHE_CLEAR':
          // 全キャッシュをクリア
          queryClient.clear()
          console.log('🔄 Cross-tab cache clear')
          break
      }
    }

    channel.addEventListener('message', handleMessage)

    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
    }
  }, [queryClient])

  // 他のタブにキャッシュ無効化を通知する関数
  const invalidateAcrossTabs = (queryKey: string[]) => {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const channel = new BroadcastChannel('cache-sync')
      channel.postMessage({ type: 'CACHE_INVALIDATE', queryKey })
      channel.close()
    }
  }

  // 他のタブにキャッシュ更新を通知する関数
  const updateAcrossTabs = (queryKey: string[], data: any) => {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const channel = new BroadcastChannel('cache-sync')
      channel.postMessage({ type: 'CACHE_UPDATE', queryKey, data })
      channel.close()
    }
  }

  // 他のタブに全キャッシュクリアを通知する関数
  const clearAcrossTabs = () => {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const channel = new BroadcastChannel('cache-sync')
      channel.postMessage({ type: 'CACHE_CLEAR' })
      channel.close()
    }
  }

  return {
    invalidateAcrossTabs,
    updateAcrossTabs,
    clearAcrossTabs
  }
}

/**
 * 管理者操作時に顧客画面のキャッシュを無効化する
 */
export function useAdminCacheSync() {
  const { invalidateAcrossTabs } = useCrossTabSync()

  const invalidateCustomerCache = () => {
    // 顧客画面で使用されるキャッシュを無効化
    invalidateAcrossTabs(['products'])
    invalidateAcrossTabs(['categories'])
    invalidateAcrossTabs(['system-settings'])
  }

  const invalidateProductCache = () => {
    invalidateAcrossTabs(['products'])
  }

  const invalidateOrderCache = () => {
    invalidateAcrossTabs(['orders'])
  }

  return {
    invalidateCustomerCache,
    invalidateProductCache,
    invalidateOrderCache
  }
}