'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

type PaymentSettings = {
  id: string
  stripePublicKey?: string
  isTestMode: boolean
  isActive: boolean
  currency: string
  createdAt: string
  updatedAt: string
}

export default function PaymentSettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [formData, setFormData] = useState({
    stripePublicKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    isTestMode: true,
    isActive: false,
    currency: 'jpy'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canManagePaymentSettings = session?.user?.role && hasPermission(session.user.role as UserRole, 'MANAGE_PAYMENT_SETTINGS')

  useEffect(() => {
    if (canManagePaymentSettings) {
      fetchSettings()
    } else {
      setLoading(false)
    }
  }, [canManagePaymentSettings])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/payment-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setFormData({
          stripePublicKey: data.stripePublicKey || '',
          stripeSecretKey: '', // Never populate secret fields
          stripeWebhookSecret: '', // Never populate secret fields
          isTestMode: data.isTestMode || true,
          isActive: data.isActive || false,
          currency: data.currency || 'jpy'
        })
        setError('')
      } else {
        console.error('Failed to fetch payment settings:', response.status)
        setError('設定の初期化に失敗しました。ページを再読み込みしてください。')
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error)
      setError('ネットワークエラーが発生しました。接続を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/payment-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setSuccess('決済設定を保存しました')
        // Clear secret fields
        setFormData(prev => ({ 
          ...prev, 
          stripeSecretKey: '',
          stripeWebhookSecret: ''
        }))
      } else {
        const errorData = await response.json()
        setError(errorData.error || '設定の保存に失敗しました')
      }
    } catch (error) {
      console.error('Error saving payment settings:', error)
      setError('設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!settings?.isActive) {
      setError('決済機能を有効にしてから接続テストを実行してください')
      return
    }

    setTesting(true)
    try {
      setError('')
      setSuccess('')
      const response = await fetch('/api/payment-settings/test', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`接続テストに成功しました（アカウント: ${data.details?.email || 'N/A'}）`)
      } else {
        const errorData = await response.json()
        setError(`接続テストに失敗しました: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      setError('接続テストに失敗しました')
    } finally {
      setTesting(false)
    }
  }

  if (!canManagePaymentSettings) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス拒否</h1>
        <p className="text-gray-600">決済設定機能はオーナーのみアクセス可能です。</p>
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">決済設定</h1>
        <p className="mt-2 text-gray-600">
          Stripe決済を設定して、オンライン決済機能を有効にします。
        </p>
      </div>

      {/* Stripe設定ガイド */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Stripe設定ガイド</h3>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="underline">Stripeダッシュボード</a> でアカウントを作成</li>
          <li>2. 開発者 → API キー からPublishable keyとSecret keyを取得</li>
          <li>3. Webhook → エンドポイント追加で Webhook Secret を取得</li>
          <li>4. 本番環境では「本番モード」に切り替え</li>
        </ol>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {/* Mode Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">動作モード</h3>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isTestMode"
                  value="true"
                  checked={formData.isTestMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, isTestMode: true }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">テストモード（推奨）</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isTestMode"
                  value="false"
                  checked={!formData.isTestMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, isTestMode: false }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">本番モード</span>
              </label>
            </div>
          </div>

          {/* Stripe API Keys */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Stripe API設定</h3>
            
            <div>
              <label htmlFor="stripePublicKey" className="block text-sm font-medium text-gray-700 mb-2">
                Publishable Key
              </label>
              <input
                type="text"
                id="stripePublicKey"
                name="stripePublicKey"
                value={formData.stripePublicKey}
                onChange={handleInputChange}
                placeholder={formData.isTestMode ? "pk_test_..." : "pk_live_..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="stripeSecretKey" className="block text-sm font-medium text-gray-700 mb-2">
                Secret Key
                <span className="text-xs text-gray-500 ml-2">安全に保存されます</span>
              </label>
              <input
                type="password"
                id="stripeSecretKey"
                name="stripeSecretKey"
                value={formData.stripeSecretKey}
                onChange={handleInputChange}
                placeholder={formData.isTestMode ? "sk_test_..." : "sk_live_..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="stripeWebhookSecret" className="block text-sm font-medium text-gray-700 mb-2">
                Webhook Secret（オプション）
                <span className="text-xs text-gray-500 ml-2">決済完了通知用</span>
              </label>
              <input
                type="password"
                id="stripeWebhookSecret"
                name="stripeWebhookSecret"
                value={formData.stripeWebhookSecret}
                onChange={handleInputChange}
                placeholder="whsec_..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* General Settings */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900">一般設定</h3>
            
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                通貨
              </label>
              <select
                id="currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="jpy">日本円（JPY）</option>
                <option value="usd">米ドル（USD）</option>
                <option value="eur">ユーロ（EUR）</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                決済機能を有効にする
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={!settings?.isActive || testing}
            >
              {testing ? '接続テスト中...' : '接続テスト'}
            </Button>
            
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? '保存中...' : '設定を保存'}
            </Button>
          </div>
        </form>
      </div>

      {/* Current Status */}
      {settings && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">現在の設定</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>ステータス: <span className={settings.isActive ? 'text-green-600' : 'text-red-600'}>
              {settings.isActive ? '有効' : '無効'}
            </span></p>
            <p>モード: <span className={settings.isTestMode ? 'text-orange-600' : 'text-green-600'}>
              {settings.isTestMode ? 'テストモード' : '本番モード'}
            </span></p>
            <p>通貨: {settings.currency.toUpperCase()}</p>
            <p>最終更新: {new Date(settings.updatedAt).toLocaleDateString('ja-JP')}</p>
          </div>
        </div>
      )}
    </div>
  )
}