'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // データが古くなるまでの時間（5分）
        staleTime: 5 * 60 * 1000,
        // キャッシュ保持時間（10分）
        gcTime: 10 * 60 * 1000,
        // リフェッチ条件
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // リトライ設定
        retry: 1,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
      }
    }
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 開発環境のみDevToolsを表示 */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}