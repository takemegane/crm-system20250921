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
  dashboardWidgets?: any[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type DashboardWidget = {
  id: string
  title: string
  type: 'sales-report' | 'quick-stats' | 'recent-orders' | 'customer-stats'
  enabled: boolean
  order: number
  size: 'small' | 'medium' | 'large'
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

  // ダッシュボードウィジェット設定
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'sales-report',
      title: '売上レポート',
      type: 'sales-report',
      enabled: true,
      order: 1,
      size: 'large'
    },
    {
      id: 'quick-stats',
      title: 'クイック統計',
      type: 'quick-stats',
      enabled: true,
      order: 2,
      size: 'medium'
    },
    {
      id: 'recent-orders',
      title: '最近の注文',
      type: 'recent-orders',
      enabled: true,
      order: 3,
      size: 'medium'
    },
    {
      id: 'customer-stats',
      title: '顧客統計',
      type: 'customer-stats',
      enabled: false,
      order: 4,
      size: 'small'
    }
  ])

  // メニューリンク設定
  const [menuLinks, setMenuLinks] = useState([
    { id: 'customers', title: '👥 顧客管理', url: '/dashboard/customers', enabled: true, order: 1 },
    { id: 'courses', title: '📚 コース管理', url: '/dashboard/courses', enabled: true, order: 2 },
    { id: 'products', title: '🛍️ 商品管理', url: '/dashboard/products', enabled: true, order: 3 },
    { id: 'orders', title: '📦 注文管理', url: '/dashboard/orders', enabled: true, order: 4 },
    { id: 'tags', title: '🏷️ タグ管理', url: '/dashboard/tags', enabled: false, order: 5 },
    { id: 'categories', title: '📂 カテゴリ管理', url: '/dashboard/categories', enabled: false, order: 6 },
    { id: 'shipping-rates', title: '🚚 送料設定', url: '/dashboard/shipping-rates', enabled: false, order: 7 },
    { id: 'email-templates', title: '📧 メール管理', url: '/dashboard/email-templates', enabled: false, order: 8 },
    { id: 'payment-settings', title: '💳 決済設定', url: '/dashboard/payment-settings', enabled: false, order: 9 },
    { id: 'payment-logs', title: '💰 決済ログ', url: '/dashboard/payment-logs', enabled: false, order: 10 },
    { id: 'sales-reports', title: '📊 売上分析', url: '/dashboard/sales-reports', enabled: false, order: 11 },
    { id: 'admins', title: '👨‍💼 管理者', url: '/dashboard/admins', enabled: false, order: 12 },
    { id: 'audit-logs', title: '📋 操作履歴', url: '/dashboard/audit-logs', enabled: false, order: 13 }
  ])

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
      
      // ダッシュボードウィジェット設定を読み込み
      if (data.dashboardWidgets && Array.isArray(data.dashboardWidgets) && data.dashboardWidgets.length > 0) {
        setWidgets(data.dashboardWidgets)
      }
      
      // メニューリンク設定を読み込み
      if (data.menuLinks && Array.isArray(data.menuLinks) && data.menuLinks.length > 0) {
        setMenuLinks(data.menuLinks)
      }
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
        body: JSON.stringify({
          ...formData,
          dashboardWidgets: widgets,
          menuLinks: menuLinks
        })
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

  // ダッシュボードウィジェット操作関数
  const handleWidgetToggle = (widgetId: string) => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, enabled: !widget.enabled }
        : widget
    ))
  }

  const handleWidgetOrderChange = (widgetId: string, direction: 'up' | 'down') => {
    setWidgets(prev => {
      const currentIndex = prev.findIndex(w => w.id === widgetId)
      if (currentIndex === -1) return prev

      const newWidgets = [...prev]
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      
      if (targetIndex < 0 || targetIndex >= newWidgets.length) return prev

      // スワップ
      const temp = newWidgets[currentIndex]
      newWidgets[currentIndex] = newWidgets[targetIndex]
      newWidgets[targetIndex] = temp

      // オーダーを再計算
      return newWidgets.map((widget, index) => ({
        ...widget,
        order: index + 1
      }))
    })
  }

  const handleWidgetSizeChange = (widgetId: string, size: 'small' | 'medium' | 'large') => {
    setWidgets(prev => prev.map(widget => 
      widget.id === widgetId 
        ? { ...widget, size }
        : widget
    ))
  }

  // メニューリンク操作関数
  const handleMenuLinkToggle = (linkId: string) => {
    setMenuLinks(prev => prev.map(link => 
      link.id === linkId 
        ? { ...link, enabled: !link.enabled }
        : link
    ))
  }

  const handleMenuLinkOrderChange = (linkId: string, direction: 'up' | 'down') => {
    setMenuLinks(prev => {
      const currentIndex = prev.findIndex(l => l.id === linkId)
      if (currentIndex === -1) return prev

      const newLinks = [...prev]
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      
      if (targetIndex < 0 || targetIndex >= newLinks.length) return prev

      // スワップ
      const temp = newLinks[currentIndex]
      newLinks[currentIndex] = newLinks[targetIndex]
      newLinks[targetIndex] = temp

      // オーダーを再計算
      return newLinks.map((link, index) => ({
        ...link,
        order: index + 1
      }))
    })
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

        {/* ダッシュボード設定セクション */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">📊 ダッシュボード設定</h2>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              <strong>🎯 ダッシュボードのカスタマイズ：</strong><br />
              表示したいウィジェットを選択し、順序とサイズを調整できます。
              設定は管理者画面のダッシュボードに即座に反映されます。
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-sm font-medium text-gray-700 mb-4">利用可能なウィジェット</div>
            
            {widgets.map((widget, index) => (
              <div key={widget.id} className={`border rounded-lg p-4 ${widget.enabled ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={widget.enabled}
                      onChange={() => handleWidgetToggle(widget.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{widget.title}</h4>
                      <p className="text-sm text-gray-600">
                        {widget.type === 'sales-report' && '売上データの詳細レポートを表示します'}
                        {widget.type === 'quick-stats' && '主要な統計数値をクイック表示します'}
                        {widget.type === 'recent-orders' && '最新の注文一覧を表示します'}
                        {widget.type === 'customer-stats' && '顧客関連の統計情報を表示します'}
                      </p>
                    </div>
                  </div>
                  
                  {widget.enabled && (
                    <div className="flex items-center space-x-2">
                      {/* 順序変更ボタン */}
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => handleWidgetOrderChange(widget.id, 'up')}
                          disabled={index === 0}
                          className={`p-1 rounded ${index === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWidgetOrderChange(widget.id, 'down')}
                          disabled={index === widgets.length - 1}
                          className={`p-1 rounded ${index === widgets.length - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          ↓
                        </button>
                      </div>
                      
                      {/* サイズ選択 */}
                      <select
                        value={widget.size}
                        onChange={(e) => handleWidgetSizeChange(widget.id, e.target.value as 'small' | 'medium' | 'large')}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="small">小</option>
                        <option value="medium">中</option>
                        <option value="large">大</option>
                      </select>
                    </div>
                  )}
                </div>
                
                {widget.enabled && (
                  <div className="text-xs text-green-700">
                    順序: {widget.order} | サイズ: {
                      widget.size === 'small' ? '小' :
                      widget.size === 'medium' ? '中' : '大'
                    }
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>💡 ヒント：</strong> ウィジェットは上から順番にダッシュボードに表示されます。
              サイズは画面領域に影響し、大きいウィジェットほど多くの情報を表示できます。
            </p>
          </div>
        </div>

        {/* メニューリンク設定セクション */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">🔗 ダッシュボードメニューリンク設定</h2>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800">
              <strong>🎯 メニューリンクのカスタマイズ：</strong><br />
              ダッシュボードに表示したい管理メニューを選択し、順序を調整できます。
              有効にしたメニューがダッシュボードにリンクボタンとして表示されます。
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700 mb-4">利用可能なメニューリンク</div>
            
            {menuLinks.map((link, index) => (
              <div key={link.id} className={`border rounded-lg p-3 ${link.enabled ? 'border-orange-300 bg-orange-50' : 'border-gray-300 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={link.enabled}
                      onChange={() => handleMenuLinkToggle(link.id)}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{link.title}</h4>
                      <p className="text-xs text-gray-600">{link.url}</p>
                    </div>
                  </div>
                  
                  {link.enabled && (
                    <div className="flex items-center space-x-2">
                      {/* 順序変更ボタン */}
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => handleMenuLinkOrderChange(link.id, 'up')}
                          disabled={index === 0}
                          className={`p-1 rounded text-xs ${index === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMenuLinkOrderChange(link.id, 'down')}
                          disabled={index === menuLinks.length - 1}
                          className={`p-1 rounded text-xs ${index === menuLinks.length - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-gray-900'}`}
                        >
                          ↓
                        </button>
                      </div>
                      <div className="text-xs text-orange-700">順序: {link.order}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>💡 ヒント：</strong> 有効にしたメニューリンクは、ダッシュボードのクイックアクセスセクションに表示されます。
              よく使う機能を上位に配置することで、効率的な作業ができます。
            </p>
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