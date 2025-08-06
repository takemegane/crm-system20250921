import { useQuery } from '@tanstack/react-query'

type SystemSettings = {
  systemName: string
  primaryColor?: string
  secondaryColor?: string
  backgroundColor?: string
  logoUrl?: string
  communityLinkText?: string
  communityLinkUrl?: string
}

const defaultSettings: SystemSettings = {
  systemName: 'ECショップ'
}

async function fetchSystemSettings(): Promise<SystemSettings> {
  const response = await fetch('/api/system-settings')
  if (!response.ok) {
    // エラー時はデフォルト値を返す
    return defaultSettings
  }
  return response.json()
}

export function useSystemSettings() {
  return useQuery({
    queryKey: ['systemSettings'],
    queryFn: fetchSystemSettings,
    // システム設定は変更頻度が低いので長時間キャッシュ
    staleTime: 15 * 60 * 1000, // 15分
    gcTime: 30 * 60 * 1000, // 30分
    // エラー時はデフォルト値を返すので再試行しない
    retry: false,
    // 初期値としてデフォルト設定を使用
    initialData: defaultSettings
  })
}