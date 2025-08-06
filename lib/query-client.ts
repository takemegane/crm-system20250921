import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
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
})