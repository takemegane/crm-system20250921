'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hasPermission, UserRole } from '@/lib/permissions'
import { useSystemSettings } from '@/contexts/SystemSettingsContext'

type SystemSettings = {
  id: string
  systemName: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  description?: string
  communityLinkText?: string
  communityLinkUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function SystemSettingsPage() {
  const { data: session } = useSession()
  const { refreshSettings } = useSystemSettings()
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // フォームデータ
  const [formData, setFormData] = useState({
    systemName: '',
    logoUrl: '',
    faviconUrl: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1F2937',
    backgroundColor: '#F8FAFC',
    description: '',
    communityLinkText: '',
    communityLinkUrl: ''
  })

  // アップロード状態
  const [uploading, setUploading] = useState(false)

  // オーナーのみアクセス可能
  const isOwner = session?.user?.role === 'OWNER'

  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/system-settings')
      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }
      const data = await response.json()
      setSettings(data)
      setFormData({
        systemName: data.systemName || '',
        logoUrl: data.logoUrl || '',
        faviconUrl: data.faviconUrl || '',
        primaryColor: data.primaryColor || '#3B82F6',
        secondaryColor: data.secondaryColor || '#1F2937',
        backgroundColor: data.backgroundColor || '#F8FAFC',
        description: data.description || '',
        communityLinkText: data.communityLinkText || '',
        communityLinkUrl: data.communityLinkUrl || ''
      })
    } catch (error) {
      setError('設定の取得に失敗しました')
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'faviconUrl') => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      setFormData(prev => ({
        ...prev,
        [field]: result.url
      }))
      setSuccess('画像がアップロードされました')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Save failed')
      }

      const updatedSettings = await response.json()
      setSettings(updatedSettings)
      // リアルタイム更新のため、グローバル設定を更新
      await refreshSettings()
      setSuccess('設定が保存されました')
      
      // ポップアップで成功メッセージ表示
      alert('✅ システム設定が正常に保存されました！\n\n変更内容がシステム全体に反映されます。')
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  useEffect(() => {
    if (isOwner) {
      fetchSettings()
    }
  }, [isOwner, fetchSettings])

  if (!isOwner) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">権限がありません</h1>
        <p className="text-gray-600 mb-6">この機能はオーナーのみ利用可能です。</p>
        <Link href="/dashboard">
          <Button variant="outline">ダッシュボードに戻る</Button>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">システム設定</h1>
        <p className="text-gray-600 mt-2">
          システムの外観とブランディングを設定できます
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">基本設定</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                システム名
              </label>
              <Input
                type="text"
                value={formData.systemName}
                onChange={(e) => handleInputChange('systemName', e.target.value)}
                placeholder="CRM管理システム"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                説明
              </label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="システムの説明（任意）"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">画像設定</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ロゴ画像
              </label>
              {formData.logoUrl && (
                <div className="mb-3">
                  <img 
                    src={formData.logoUrl} 
                    alt="Logo preview" 
                    className="h-16 w-auto object-contain border rounded"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'logoUrl')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 mt-1">
                推奨: 200x60px以下、5MB以下
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ファビコン
              </label>
              {formData.faviconUrl && (
                <div className="mb-3">
                  <img 
                    src={formData.faviconUrl} 
                    alt="Favicon preview" 
                    className="h-8 w-8 object-contain border rounded"
                  />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'faviconUrl')}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                disabled={uploading}
              />
              <p className="text-xs text-gray-500 mt-1">
                推奨: 32x32px、5MB以下
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">カラー設定</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                プライマリカラー
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <Input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) => handleInputChange('primaryColor', e.target.value)}
                  className="flex-1"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                セカンダリカラー
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <Input
                  type="text"
                  value={formData.secondaryColor}
                  onChange={(e) => handleInputChange('secondaryColor', e.target.value)}
                  className="flex-1"
                  placeholder="#1F2937"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                背景色
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                  className="h-10 w-20 rounded border border-gray-300"
                />
                <Input
                  type="text"
                  value={formData.backgroundColor}
                  onChange={(e) => handleInputChange('backgroundColor', e.target.value)}
                  className="flex-1"
                  placeholder="#F8FAFC"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">デフォルトコミュニティリンク設定</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>📌 この設定について：</strong><br />
              ここで設定したリンクは、<strong>コース専用のコミュニティリンクが設定されていない場合のデフォルト</strong>として使用されます。
              各コースに個別のコミュニティリンクを設定したい場合は、コース管理 → 各コースの編集画面から設定してください。
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                デフォルトリンクテキスト
              </label>
              <Input
                type="text"
                value={formData.communityLinkText}
                onChange={(e) => handleInputChange('communityLinkText', e.target.value)}
                placeholder="例：コミュニティに参加する"
              />
              <p className="text-xs text-gray-500 mt-1">
                コース専用リンクが未設定の場合に表示されるボタンのテキストです
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                デフォルトリンクURL
              </label>
              <Input
                type="url"
                value={formData.communityLinkUrl}
                onChange={(e) => handleInputChange('communityLinkUrl', e.target.value)}
                placeholder="例：https://discord.gg/example"
              />
              <p className="text-xs text-gray-500 mt-1">
                全コース共通のコミュニティページがある場合に設定してください（任意）
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href="/dashboard">
            <Button variant="outline">キャンセル</Button>
          </Link>
          <Button 
            type="submit" 
            disabled={saving || uploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? '保存中...' : '設定を保存'}
          </Button>
        </div>
      </form>
    </div>
  )
}