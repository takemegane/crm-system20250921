import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/utils/api-error-handler'

type SystemSettings = {
  systemName: string
  primaryColor?: string
  secondaryColor?: string
  backgroundColor?: string
  logoUrl?: string
  communityLinkText?: string
  communityLinkUrl?: string
}

async function fetchSystemSettings(): Promise<SystemSettings> {
  try {
    return await apiClient<SystemSettings>('/api/system-settings')
  } catch (error) {
    // エラー時はデフォルト値を返す
    console.warn('System settings fetch failed, using defaults:', error)
    return {
      systemName: 'CRMシステム',
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      backgroundColor: '#F8FAFC'
    }
  }
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['system-settings'],
    queryFn: fetchSystemSettings,
    // システム設定は変更頻度が低いので長時間キャッシュ
    staleTime: 15 * 60 * 1000, // 15分
    gcTime: 30 * 60 * 1000, // 30分
    // エラー時でも再試行（APIが利用可能になった場合の対応）
    retry: 1,
    retryDelay: 5000
  })
}