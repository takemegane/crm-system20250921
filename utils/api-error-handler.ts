import { useSessionExpiredHandler } from '@/hooks/use-auth-cache'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

/**
 * API レスポンスを処理し、適切なエラーを投げる
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // 認証エラーの場合
    if (response.status === 401) {
      console.log('🔐 Authentication error detected')
      // セッション期限切れとして処理
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new ApiError('認証が必要です', 401, 'UNAUTHORIZED')
    }
    
    // 権限エラーの場合
    if (response.status === 403) {
      throw new ApiError('アクセス権限がありません', 403, 'FORBIDDEN')
    }
    
    // リソースが見つからない場合
    if (response.status === 404) {
      throw new ApiError('リソースが見つかりません', 404, 'NOT_FOUND')
    }
    
    // サーバーエラーの場合
    if (response.status >= 500) {
      throw new ApiError('サーバーエラーが発生しました', response.status, 'SERVER_ERROR')
    }
    
    // その他のエラー
    const message = errorData.error || errorData.message || 'リクエストに失敗しました'
    throw new ApiError(message, response.status, errorData.code)
  }

  return response.json()
}

/**
 * 共通の fetch ラッパー（認証ヘッダーとエラーハンドリング付き）
 */
export async function apiClient<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  return handleApiResponse<T>(response)
}

/**
 * キャッシュフレンドリーなエラー情報を生成
 */
export function createCacheableError(error: unknown) {
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
      timestamp: Date.now()
    }
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      timestamp: Date.now()
    }
  }
  
  return {
    message: 'Unknown error',
    timestamp: Date.now()
  }
}