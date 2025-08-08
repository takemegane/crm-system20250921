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
  
  // 支払い方法表示制御
  enableCreditCard: boolean
  enableBankTransfer: boolean
  enableCashOnDelivery: boolean
  
  // 手数料設定
  creditCardFeeType: string
  creditCardFeeRate: number
  creditCardFeeFixed: number
  bankTransferFee: number
  cashOnDeliveryFee: number
  
  // 手数料負担者設定
  creditCardFeeBearer: string
  bankTransferFeeBearer: string
  cashOnDeliveryFeeBearer: string
  
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
    currency: 'jpy',
    
    // 支払い方法表示制御
    enableCreditCard: false,
    enableBankTransfer: true,
    enableCashOnDelivery: true,
    
    // 手数料設定
    creditCardFeeType: 'percentage',
    creditCardFeeRate: 3.6,
    creditCardFeeFixed: 0,
    bankTransferFee: 0,
    cashOnDeliveryFee: 330,
    
    // 手数料負担者設定
    creditCardFeeBearer: 'merchant',
    bankTransferFeeBearer: 'customer',
    cashOnDeliveryFeeBearer: 'customer'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 支払い方法設定用の状態
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')

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
          currency: data.currency || 'jpy',
          
          // 支払い方法表示制御
          enableCreditCard: data.enableCreditCard || false,
          enableBankTransfer: data.enableBankTransfer ?? true,
          enableCashOnDelivery: data.enableCashOnDelivery ?? true,
          
          // 手数料設定
          creditCardFeeType: data.creditCardFeeType || 'percentage',
          creditCardFeeRate: data.creditCardFeeRate || 3.6,
          creditCardFeeFixed: data.creditCardFeeFixed || 0,
          bankTransferFee: data.bankTransferFee || 0,
          cashOnDeliveryFee: data.cashOnDeliveryFee || 330,
          
          // 手数料負担者設定
          creditCardFeeBearer: data.creditCardFeeBearer || 'merchant',
          bankTransferFeeBearer: data.bankTransferFeeBearer || 'customer',
          cashOnDeliveryFeeBearer: data.cashOnDeliveryFeeBearer || 'customer'
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
      // Stripe設定のみを送信
      const stripeData = {
        stripePublicKey: formData.stripePublicKey,
        stripeSecretKey: formData.stripeSecretKey,
        stripeWebhookSecret: formData.stripeWebhookSecret,
        isTestMode: formData.isTestMode,
        isActive: formData.isActive,
        currency: formData.currency
      }

      const response = await fetch('/api/payment-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stripeData),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setSuccess('Stripe設定を保存しました')
        // ポップアップで成功を通知
        alert('✅ Stripe設定が正常に保存されました！')
        // Clear secret fields
        setFormData(prev => ({ 
          ...prev, 
          stripeSecretKey: '',
          stripeWebhookSecret: ''
        }))
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Stripe設定の保存に失敗しました'
        setError(errorMessage)
        // ポップアップでエラーを通知
        alert('❌ ' + errorMessage)
      }
    } catch (error) {
      console.error('Error saving Stripe settings:', error)
      const errorMessage = 'Stripe設定の保存に失敗しました'
      setError(errorMessage)
      // ポップアップでエラーを通知
      alert('❌ ' + errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handlePaymentMethodSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPaymentSaving(true)
    setPaymentError('')
    setPaymentSuccess('')

    try {
      // 支払い方法・手数料設定のみを送信（Stripe設定は除外）
      const paymentMethodData = {
        enableCreditCard: formData.enableCreditCard,
        enableBankTransfer: formData.enableBankTransfer,
        enableCashOnDelivery: formData.enableCashOnDelivery,
        creditCardFeeType: formData.creditCardFeeType,
        creditCardFeeRate: formData.creditCardFeeRate,
        creditCardFeeFixed: formData.creditCardFeeFixed,
        bankTransferFee: formData.bankTransferFee,
        cashOnDeliveryFee: formData.cashOnDeliveryFee,
        creditCardFeeBearer: formData.creditCardFeeBearer,
        bankTransferFeeBearer: formData.bankTransferFeeBearer,
        cashOnDeliveryFeeBearer: formData.cashOnDeliveryFeeBearer
      }

      const response = await fetch('/api/payment-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentMethodData),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setPaymentSuccess('支払い方法・手数料設定を保存しました')
        // ポップアップで成功を通知
        alert('✅ 支払い方法・手数料設定が正常に保存されました！')
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || '支払い方法設定の保存に失敗しました'
        setPaymentError(errorMessage)
        // ポップアップでエラーを通知
        alert('❌ ' + errorMessage)
      }
    } catch (error) {
      console.error('Error saving payment method settings:', error)
      const errorMessage = '支払い方法設定の保存に失敗しました'
      setPaymentError(errorMessage)
      // ポップアップでエラーを通知
      alert('❌ ' + errorMessage)
    } finally {
      setPaymentSaving(false)
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
        const successMessage = `接続テストに成功しました（アカウント: ${data.details?.email || 'N/A'}）`
        setSuccess(successMessage)
        // ポップアップで成功を通知
        alert('✅ ' + successMessage)
      } else {
        const errorData = await response.json()
        const errorMessage = `接続テストに失敗しました: ${errorData.error}`
        setError(errorMessage)
        // ポップアップでエラーを通知
        alert('❌ ' + errorMessage)
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      const errorMessage = '接続テストに失敗しました'
      setError(errorMessage)
      // ポップアップでエラーを通知
      alert('❌ ' + errorMessage)
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

      {/* 支払い方法・手数料設定セクション */}
      <div className="bg-white shadow sm:rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">支払い方法・手数料設定</h2>
          <p className="mt-2 text-gray-600">顧客に表示する支払い方法と手数料を設定します</p>
        </div>
        
        <form onSubmit={handlePaymentMethodSubmit} className="space-y-6 p-6">
          {paymentError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {paymentError}
            </div>
          )}

          {paymentSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
              {paymentSuccess}
            </div>
          )}

          {/* Payment Method Display Control */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">支払い方法設定</h3>
            <p className="text-sm text-gray-600">顧客に表示する支払い方法を選択できます</p>
            
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableCreditCard"
                  name="enableCreditCard"
                  checked={formData.enableCreditCard}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enableCreditCard" className="ml-2 block text-sm text-gray-700">
                  💳 クレジットカード決済を有効にする
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableBankTransfer"
                  name="enableBankTransfer"
                  checked={formData.enableBankTransfer}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enableBankTransfer" className="ml-2 block text-sm text-gray-700">
                  🏦 銀行振込を有効にする
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableCashOnDelivery"
                  name="enableCashOnDelivery"
                  checked={formData.enableCashOnDelivery}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enableCashOnDelivery" className="ml-2 block text-sm text-gray-700">
                  📦 代金引換を有効にする
                </label>
              </div>
            </div>
          </div>

          {/* Fee Settings */}
          <div className="space-y-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900">手数料設定</h3>
            
            {/* Credit Card Fee Settings */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-blue-900 mb-3">💳 クレジットカード手数料</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">手数料タイプ</label>
                  <select
                    name="creditCardFeeType"
                    value={formData.creditCardFeeType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="percentage">パーセンテージ（%）</option>
                    <option value="fixed">固定金額（円）</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">手数料負担者</label>
                  <select
                    name="creditCardFeeBearer"
                    value={formData.creditCardFeeBearer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="merchant">加盟店負担</option>
                    <option value="customer">顧客負担</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {formData.creditCardFeeType === 'percentage' ? 'パーセンテージ手数料（%）' : '固定手数料（円）'}
                  </label>
                  <input
                    type="number"
                    name={formData.creditCardFeeType === 'percentage' ? 'creditCardFeeRate' : 'creditCardFeeFixed'}
                    value={formData.creditCardFeeType === 'percentage' ? formData.creditCardFeeRate : formData.creditCardFeeFixed}
                    onChange={handleInputChange}
                    step={formData.creditCardFeeType === 'percentage' ? '0.1' : '1'}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder={formData.creditCardFeeType === 'percentage' ? '3.6' : '0'}
                  />
                </div>
              </div>
            </div>

            {/* Bank Transfer Fee Settings */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-green-900 mb-3">🏦 銀行振込手数料</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">振込手数料（円）</label>
                  <input
                    type="number"
                    name="bankTransferFee"
                    value={formData.bankTransferFee}
                    onChange={handleInputChange}
                    step="1"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">手数料負担者</label>
                  <select
                    name="bankTransferFeeBearer"
                    value={formData.bankTransferFeeBearer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="merchant">加盟店負担</option>
                    <option value="customer">顧客負担</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cash on Delivery Fee Settings */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="text-md font-semibold text-orange-900 mb-3">📦 代金引換手数料</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">代引き手数料（円）</label>
                  <input
                    type="number"
                    name="cashOnDeliveryFee"
                    value={formData.cashOnDeliveryFee}
                    onChange={handleInputChange}
                    step="1"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    placeholder="330"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">手数料負担者</label>
                  <select
                    name="cashOnDeliveryFeeBearer"
                    value={formData.cashOnDeliveryFeeBearer}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="merchant">加盟店負担</option>
                    <option value="customer">顧客負担</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={paymentSaving}
            >
              {paymentSaving ? '支払い方法設定を保存中...' : '支払い方法設定を保存'}
            </Button>
          </div>
        </form>
      </div>

      {/* Stripe設定セクション */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Stripe設定</h2>
          <p className="mt-2 text-gray-600">クレジットカード決済を利用するためのStripe API設定</p>
        </div>
        
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
              {saving ? 'Stripe設定を保存中...' : 'Stripe設定を保存'}
            </Button>
          </div>
        </form>
      </div>

      {/* Current Status */}
      {settings && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Stripe接続状況</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>Stripe決済: <span className={settings.isActive ? 'text-green-600' : 'text-red-600'}>
              {settings.isActive ? '有効' : '無効'}
            </span></p>
            <p>動作モード: <span className={settings.isTestMode ? 'text-orange-600' : 'text-green-600'}>
              {settings.isTestMode ? 'テストモード' : '本番モード'}
            </span></p>
            <p>通貨設定: {settings.currency.toUpperCase()}</p>
            {settings.stripePublicKey && (
              <p>Publishable Key: {settings.stripePublicKey.substring(0, 10)}...</p>
            )}
            <div className="text-xs text-gray-500 mt-2">
              <p>※ この情報はStripe設定に関するもので、支払い方法の有効/無効は上記の各設定で管理されます</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}