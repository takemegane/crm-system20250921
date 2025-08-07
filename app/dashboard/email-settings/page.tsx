'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

type EmailSettings = {
  id: string
  smtpHost: string
  smtpPort: number
  smtpUser?: string
  fromAddress?: string
  fromName: string
  signature?: string
  isActive: boolean
}

export default function EmailSettingsPage() {
  const { data: session } = useSession()
  const [settings, setSettings] = useState<EmailSettings | null>(null)
  const [formData, setFormData] = useState({
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    fromAddress: '',
    fromName: 'CRM管理システム',
    signature: '',
    isActive: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canManageEmailSettings = session?.user?.role && hasPermission(session.user.role as UserRole, 'MANAGE_EMAIL_SETTINGS')

  useEffect(() => {
    if (canManageEmailSettings) {
      fetchSettings()
    } else {
      setLoading(false)
    }
  }, [canManageEmailSettings])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/email-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setFormData({
          smtpHost: data.smtpHost || 'smtp.gmail.com',
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || '',
          smtpPass: '', // Never populate password field
          fromAddress: data.fromAddress || '',
          fromName: data.fromName || 'CRM管理システム',
          signature: data.signature || '',
          isActive: data.isActive || false
        })
        setError('') // Clear any previous errors
      } else {
        // APIは初回アクセス時に自動的にデフォルト設定を作成するため、
        // 通常はエラーになることはない
        console.error('Failed to fetch email settings:', response.status)
        setError('設定の初期化に失敗しました。ページを再読み込みしてください。')
      }
    } catch (error) {
      console.error('Error fetching email settings:', error)
      setError('ネットワークエラーが発生しました。接続を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const response = await fetch('/api/email-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setSuccess('メール設定を保存しました')
        // Clear password field
        setFormData(prev => ({ ...prev, smtpPass: '' }))
      } else {
        const errorData = await response.json()
        setError(errorData.error || '設定の保存に失敗しました')
      }
    } catch (error) {
      console.error('Error saving email settings:', error)
      setError('設定の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!settings?.isActive) {
      setError('メール送信を有効にしてから接続テストを実行してください')
      return
    }

    try {
      setError('')
      setSuccess('')
      const response = await fetch('/api/email-settings/test', {
        method: 'POST'
      })

      if (response.ok) {
        setSuccess('接続テストに成功しました')
      } else {
        const errorData = await response.json()
        setError(`接続テストに失敗しました: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      setError('接続テストに失敗しました')
    }
  }

  if (!canManageEmailSettings) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス拒否</h1>
        <p className="text-gray-600">メール設定機能はオーナーのみアクセス可能です。</p>
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
        <h1 className="text-3xl font-bold text-gray-900">メール設定</h1>
        <p className="mt-2 text-gray-600">
          Gmail SMTP設定を行い、システムからメールを送信できるようにします。
        </p>
      </div>

      {/* Gmail設定ガイド */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Gmail設定ガイド</h3>
        <ol className="text-sm text-blue-800 space-y-1">
          <li>1. Googleアカウントで2段階認証を有効にする</li>
          <li>2. アプリパスワードを生成する（16文字）</li>
          <li>3. SMTPユーザー名: Gmailアドレス</li>
          <li>4. SMTPパスワード: アプリパスワード（通常のパスワードではない）</li>
          <li>5. 送信元アドレス: Gmailアドレス（または認証済みエイリアス）</li>
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

          {/* SMTP Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">SMTP設定</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700 mb-2">
                  SMTPホスト
                </label>
                <input
                  type="text"
                  id="smtpHost"
                  name="smtpHost"
                  value={formData.smtpHost}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700 mb-2">
                  SMTPポート
                </label>
                <input
                  type="number"
                  id="smtpPort"
                  name="smtpPort"
                  value={formData.smtpPort}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700 mb-2">
                SMTPユーザー名（Gmailアドレス）
              </label>
              <input
                type="email"
                id="smtpUser"
                name="smtpUser"
                value={formData.smtpUser}
                onChange={handleInputChange}
                placeholder="your-email@gmail.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="smtpPass" className="block text-sm font-medium text-gray-700 mb-2">
                SMTPパスワード（アプリパスワード）
                <span className="text-xs text-gray-500 ml-2">16文字のアプリパスワード</span>
              </label>
              <input
                type="password"
                id="smtpPass"
                name="smtpPass"
                value={formData.smtpPass}
                onChange={handleInputChange}
                placeholder="16文字のアプリパスワードを入力"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Email Settings */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900">送信者情報</h3>
            
            <div>
              <label htmlFor="fromAddress" className="block text-sm font-medium text-gray-700 mb-2">
                送信元アドレス
                <span className="text-xs text-gray-500 ml-2">空欄の場合はSMTPユーザー名を使用</span>
              </label>
              <input
                type="email"
                id="fromAddress"
                name="fromAddress"
                value={formData.fromAddress}
                onChange={handleInputChange}
                placeholder="noreply@your-domain.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="fromName" className="block text-sm font-medium text-gray-700 mb-2">
                送信者名
              </label>
              <input
                type="text"
                id="fromName"
                name="fromName"
                value={formData.fromName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="signature" className="block text-sm font-medium text-gray-700 mb-2">
                メール署名
              </label>
              <textarea
                id="signature"
                name="signature"
                value={formData.signature}
                onChange={handleInputChange}
                rows={4}
                placeholder="--&#10;CRM管理システム&#10;お問い合わせ: support@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
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
                メール送信を有効にする
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={testConnection}
              disabled={!settings?.isActive}
            >
              接続テスト
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
    </div>
  )
}