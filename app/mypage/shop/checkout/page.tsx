'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useCustomerProfile } from '@/hooks/use-customer-profile'
import { useCart } from '@/hooks/use-cart'
import { useQueryClient } from '@tanstack/react-query'
import { useCrossTabSync } from '@/hooks/use-cross-tab-sync'

type CartItem = {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    stock: number
    imageUrl?: string
    isActive: boolean
  }
}

type Cart = {
  items: CartItem[]
  total: number
  itemCount: number
}


export default function CheckoutPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { invalidateAcrossTabs } = useCrossTabSync()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderCompleted, setOrderCompleted] = useState(false) // 注文完了フラグ
  const [formData, setFormData] = useState({
    shippingAddress: '',
    recipientName: '',
    contactPhone: '',
    notes: '',
    paymentMethod: 'bank_transfer' // デフォルトは銀行振込
  })
  
  // キャッシュされたデータを使用
  const { data: customerProfile } = useCustomerProfile()
  const { data: cart, isLoading: cartLoading } = useCart()
  const [addressSelection, setAddressSelection] = useState<'new' | 'profile'>('new')
  const [shippingInfo, setShippingInfo] = useState<{
    shippingFee: number
    originalShippingFee: number
    freeShippingThreshold: number | null
    isShippingFree: boolean
    totalAmount: number
  } | null>(null)
  
  const [paymentSettings, setPaymentSettings] = useState<{
    enableCreditCard: boolean
    enableBankTransfer: boolean
    enableCashOnDelivery: boolean
    creditCardFeeType: string
    creditCardFeeRate: number
    creditCardFeeFixed: number
    bankTransferFee: number
    cashOnDeliveryFee: number
    creditCardFeeBearer: string
    bankTransferFeeBearer: string
    cashOnDeliveryFeeBearer: string
    isActive: boolean
    currency: string
  } | null>(null)

  // 決済設定を取得
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const response = await fetch('/api/payment-settings/public')
        if (response.ok) {
          const settings = await response.json()
          setPaymentSettings(settings)
          
          // デフォルトの支払い方法を設定（有効な方法の中で最初のもの）
          const availableMethods: string[] = []
          if (settings.enableBankTransfer) availableMethods.push('bank_transfer')
          if (settings.enableCashOnDelivery) availableMethods.push('cod')
          if (settings.enableCreditCard && settings.isActive) availableMethods.push('stripe')
          
          if (availableMethods.length > 0 && !availableMethods.includes(formData.paymentMethod)) {
            setFormData(prev => ({ ...prev, paymentMethod: availableMethods[0] }))
          }
        }
      } catch (error) {
        console.error('決済設定の取得に失敗しました:', error)
      }
    }
    
    fetchPaymentSettings()
  }, [])

  // カートが空の場合はカート画面にリダイレクト（注文完了時は除く）
  useEffect(() => {
    if (cart && cart.items.length === 0 && !orderCompleted) {
      router.push('/mypage/shop/cart')
    }
  }, [cart, router, orderCompleted])

  // 顧客プロフィール情報でフォームを初期化
  useEffect(() => {
    if (customerProfile) {
      setFormData(prev => ({
        ...prev,
        recipientName: customerProfile.name || '',
        contactPhone: customerProfile.phone || ''
      }))
    }
  }, [customerProfile])

  useEffect(() => {
    if (session === undefined) {
      // セッション読み込み中は何もしない
      return
    }
    
    if (session?.user?.userType === 'admin') {
      router.push('/dashboard')
    } else if (session === null) {
      // セッションが明示的にnullの場合のみログインページにリダイレクト
      router.push('/login')
    }
  }, [session, router])

  const calculateShipping = useCallback(async () => {
    if (!cart || cart.items.length === 0) {
      setShippingInfo(null)
      return
    }

    try {
      const cartItems = cart.items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }))

      const response = await fetch('/api/shipping-calc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cartItems,
          totalAmount: cart.total
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('📋 チェックアウトAPI応答内容:', result)
        
        // successResponse形式のレスポンスを処理
        const data = result.success ? result.data : result
        
        // 数値型への変換を確実に行う
        const shippingInfo = {
          shippingFee: Number(data.shippingFee) || 0,
          originalShippingFee: Number(data.originalShippingFee) || 0,
          freeShippingThreshold: data.freeShippingThreshold ? Number(data.freeShippingThreshold) : null,
          isShippingFree: Boolean(data.isShippingFree),
          totalAmount: Number(data.totalAmount) || cart.total
        }
        console.log('✅ チェックアウト送料情報設定:', shippingInfo)
        setShippingInfo(shippingInfo)
      } else {
        console.error('送料計算に失敗しました')
        setShippingInfo(null)
      }
    } catch (error) {
      console.error('送料計算中にエラーが発生しました:', error)
      setShippingInfo(null)
    }
  }, [cart])

  // カート更新時に送料を再計算
  useEffect(() => {
    if (cart && cart.items.length > 0 && session?.user?.userType === 'customer') {
      calculateShipping()
    }
  }, [cart, calculateShipping, session?.user?.userType])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '注文の作成に失敗しました')
      }

      const order = await response.json()
      console.log('✅ Order created successfully:', order)
      
      // レスポンスの構造をチェック
      if (!order || !order.id) {
        console.error('❌ Invalid order response:', order)
        throw new Error('注文の作成に成功しましたが、注文IDが取得できませんでした')
      }
      
      // 注文完了フラグを設定（カートリダイレクトを防ぐ）
      setOrderCompleted(true)
      
      // カートキャッシュを無効化（現在のタブ + 全タブ同期）
      console.log('🛒 注文作成成功 - カートキャッシュを無効化')
      queryClient.invalidateQueries({ queryKey: ['cart'] })
      invalidateAcrossTabs(['cart'])
      
      // 購入完了ポップアップ表示
      alert('🎉 購入が完了しました！\n\nありがとうございます！\n注文詳細画面に移動します。')
      
      // 注文完了画面にリダイレクト
      console.log('🔄 Redirecting to order details:', `/mypage/shop/orders/${order.id}?completed=true`)
      router.push(`/mypage/shop/orders/${order.id}?completed=true`)
    } catch (error) {
      console.error('Error creating order:', error)
      setError(error instanceof Error ? error.message : '注文の作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddressSelectionChange = (selection: 'new' | 'profile') => {
    setAddressSelection(selection)
    if (selection === 'profile' && customerProfile?.address) {
      setFormData(prev => ({
        ...prev,
        shippingAddress: customerProfile.address || ''
      }))
    } else if (selection === 'new') {
      setFormData(prev => ({
        ...prev,
        shippingAddress: ''
      }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null || isNaN(price)) {
      return '¥0'
    }
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price)
  }

  // 支払い方法に基づく手数料計算
  const calculatePaymentFee = () => {
    if (!paymentSettings || !shippingInfo) return 0

    switch (formData.paymentMethod) {
      case 'cod':
        return paymentSettings.cashOnDeliveryFeeBearer === 'customer' ? paymentSettings.cashOnDeliveryFee : 0
      case 'bank_transfer':
        return paymentSettings.bankTransferFeeBearer === 'customer' ? paymentSettings.bankTransferFee : 0
      case 'stripe':
        if (paymentSettings.creditCardFeeBearer === 'customer') {
          return paymentSettings.creditCardFeeType === 'percentage'
            ? Math.ceil(shippingInfo.totalAmount * paymentSettings.creditCardFeeRate / 100)
            : paymentSettings.creditCardFeeFixed
        }
        return 0
      default:
        return 0
    }
  }

  // 最終合計金額の計算
  const calculateFinalTotal = () => {
    if (!shippingInfo) return cart?.total || 0
    return shippingInfo.totalAmount + calculatePaymentFee()
  }

  if (cartLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">配送情報</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="recipientName" className="block text-sm font-medium text-gray-700 mb-2">
                  配送先宛名 *
                </label>
                <input
                  type="text"
                  id="recipientName"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="受取人のお名前を入力してください"
                />
              </div>

              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  連絡先電話番号
                </label>
                <input
                  type="tel"
                  id="contactPhone"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="連絡先の電話番号を入力してください"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  配送先住所 *
                </label>
                
                {/* 住所選択オプション */}
                <div className="space-y-3 mb-4">
                  {customerProfile?.address && (
                    <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="addressSelection"
                        value="profile"
                        checked={addressSelection === 'profile'}
                        onChange={() => handleAddressSelectionChange('profile')}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          アカウントに登録された住所を使用
                        </div>
                        <div className="text-sm text-gray-600 mt-1 whitespace-pre-line">
                          {customerProfile.address}
                        </div>
                      </div>
                    </label>
                  )}
                  
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="addressSelection"
                      value="new"
                      checked={addressSelection === 'new'}
                      onChange={() => handleAddressSelectionChange('new')}
                    />
                    <div className="text-sm font-medium text-gray-900">
                      新しい住所を入力
                    </div>
                  </label>
                </div>

                {/* 住所入力フィールド */}
                <textarea
                  id="shippingAddress"
                  name="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={handleChange}
                  required
                  rows={3}
                  disabled={addressSelection === 'profile' && !!customerProfile?.address}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-600"
                  placeholder="〒100-0001&#10;東京都千代田区千代田1-1&#10;千代田マンション101号室"
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  備考・要望
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="配送時間の指定、その他ご要望などをご記入ください"
                />
              </div>

              {/* 決済方法選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  お支払い方法 *
                </label>
                
                <div className="space-y-3">
                  {/* 銀行振込 */}
                  {paymentSettings?.enableBankTransfer && (
                    <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="bank_transfer"
                        checked={formData.paymentMethod === 'bank_transfer'}
                        onChange={handleChange}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">🏦</span>
                          <div className="text-sm font-medium text-gray-900">
                            銀行振込
                          </div>
                          {paymentSettings.bankTransferFee > 0 && paymentSettings.bankTransferFeeBearer === 'customer' && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              手数料 {formatPrice(paymentSettings.bankTransferFee)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          注文確定後に振込先をメールでお送りします。<br />
                          ご入金確認後に商品を発送いたします。
                          {paymentSettings.bankTransferFee > 0 && paymentSettings.bankTransferFeeBearer === 'customer' && (
                            <><br />※ 振込手数料はお客様負担となります。</>
                          )}
                        </div>
                      </div>
                    </label>
                  )}
                  
                  {/* 代金引換 */}
                  {paymentSettings?.enableCashOnDelivery && (
                    <label className="flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={formData.paymentMethod === 'cod'}
                        onChange={handleChange}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">📦</span>
                          <div className="text-sm font-medium text-gray-900">
                            代金引換
                          </div>
                          {paymentSettings.cashOnDeliveryFee > 0 && paymentSettings.cashOnDeliveryFeeBearer === 'customer' && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              手数料 {formatPrice(paymentSettings.cashOnDeliveryFee)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          商品受け取り時に配送業者にお支払いください。
                          {paymentSettings.cashOnDeliveryFee > 0 && paymentSettings.cashOnDeliveryFeeBearer === 'customer' && (
                            <><br />代金引換手数料が別途かかります。</>
                          )}
                        </div>
                      </div>
                    </label>
                  )}

                  {/* クレジットカード決済 */}
                  {paymentSettings?.enableCreditCard && (
                    <label className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${!paymentSettings.isActive ? 'opacity-60' : ''}`}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="stripe"
                        checked={formData.paymentMethod === 'stripe'}
                        onChange={handleChange}
                        disabled={!paymentSettings.isActive}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">💳</span>
                          <div className="text-sm font-medium text-gray-900">
                            クレジットカード決済
                          </div>
                          {!paymentSettings.isActive ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                              準備中
                            </span>
                          ) : (
                            paymentSettings.creditCardFeeBearer === 'customer' && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                {paymentSettings.creditCardFeeType === 'percentage' 
                                  ? `手数料 ${paymentSettings.creditCardFeeRate}%`
                                  : `手数料 ${formatPrice(paymentSettings.creditCardFeeFixed)}`
                                }
                              </span>
                            )
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Visa、Mastercard、JCB、American Express<br />
                          {!paymentSettings.isActive ? (
                            '※ 現在準備中です。近日中にご利用いただけます。'
                          ) : (
                            '安全で迅速な決済が可能です。'
                          )}
                        </div>
                      </div>
                    </label>
                  )}
                  
                  {/* 利用可能な支払い方法がない場合 */}
                  {paymentSettings && !paymentSettings.enableBankTransfer && !paymentSettings.enableCashOnDelivery && !paymentSettings.enableCreditCard && (
                    <div className="text-center py-8 text-gray-500">
                      <p>現在、利用可能な支払い方法がありません。</p>
                      <p className="text-sm mt-1">管理者にお問い合わせください。</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 代金引換手数料の警告 */}
              {formData.paymentMethod === 'cod' && paymentSettings && (paymentSettings.cashOnDeliveryFee || 0) > 0 && paymentSettings.cashOnDeliveryFeeBearer === 'customer' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-600">⚠️</span>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">代金引換手数料について</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        代金引換でのお支払いには、別途手数料{formatPrice(paymentSettings.cashOnDeliveryFee || 0)}がかかります。<br />
                        最終的なお支払い金額は {formatPrice(calculateFinalTotal())} となります。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 銀行振込の案内 */}
              {formData.paymentMethod === 'bank_transfer' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600">ℹ️</span>
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">銀行振込について</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        注文確定後、振込先口座情報をメールでお送りします。<br />
                        ご入金確認後、1-2営業日以内に商品を発送いたします。
                        {paymentSettings && (paymentSettings.bankTransferFee || 0) > 0 && paymentSettings.bankTransferFeeBearer === 'customer' && (
                          <><br />※ 振込手数料{formatPrice(paymentSettings.bankTransferFee || 0)}はお客様負担となります。</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* クレジットカード決済の案内 */}
              {formData.paymentMethod === 'stripe' && paymentSettings?.isActive && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <span className="text-green-600">💳</span>
                    <div>
                      <h4 className="text-sm font-medium text-green-800">クレジットカード決済について</h4>
                      <p className="text-sm text-green-700 mt-1">
                        安全なSSL暗号化通信でカード情報を保護します。<br />
                        決済完了後、即座に商品を発送準備いたします。
                        {paymentSettings.creditCardFeeBearer === 'customer' && (
                          <><br />※ 決済手数料（{paymentSettings.creditCardFeeType === 'percentage' 
                            ? `${paymentSettings.creditCardFeeRate}%`
                            : formatPrice(paymentSettings.creditCardFeeFixed)
                          }）はお客様負担となります。</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !formData.shippingAddress.trim() || !formData.recipientName.trim()}
                className="w-full"
              >
                {submitting ? '注文処理中...' : '注文を確定する'}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">注文内容確認</h2>
            
            <div className="space-y-4 mb-6">
              {cart?.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  {item.product.imageUrl && (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="h-12 w-12 object-cover rounded"
                    />
                  )}
                  
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatPrice(item.product.price)} × {item.quantity}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice((item.product.price || 0) * (item.quantity || 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>小計 ({cart?.itemCount || 0}点)</span>
                <span>{formatPrice(cart?.total || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>送料</span>
                <span>
                  {shippingInfo ? (
                    shippingInfo.isShippingFree ? (
                      <span className="text-green-600">無料</span>
                    ) : (
                      formatPrice(shippingInfo.shippingFee)
                    )
                  ) : (
                    '計算中...'
                  )}
                </span>
              </div>
              {/* 各支払い方法の手数料表示 */}
              {formData.paymentMethod === 'cod' && paymentSettings && (paymentSettings.cashOnDeliveryFee || 0) > 0 && paymentSettings.cashOnDeliveryFeeBearer === 'customer' && (
                <div className="flex justify-between text-sm">
                  <span>代金引換手数料</span>
                  <span>{formatPrice(paymentSettings.cashOnDeliveryFee || 0)}</span>
                </div>
              )}
              
              {formData.paymentMethod === 'bank_transfer' && paymentSettings && (paymentSettings.bankTransferFee || 0) > 0 && paymentSettings.bankTransferFeeBearer === 'customer' && (
                <div className="flex justify-between text-sm">
                  <span>銀行振込手数料</span>
                  <span>{formatPrice(paymentSettings.bankTransferFee || 0)}</span>
                </div>
              )}
              
              {formData.paymentMethod === 'stripe' && paymentSettings?.creditCardFeeBearer === 'customer' && shippingInfo && (
                <div className="flex justify-between text-sm">
                  <span>決済手数料</span>
                  <span>
                    {paymentSettings.creditCardFeeType === 'percentage' 
                      ? formatPrice(Math.ceil(shippingInfo.totalAmount * paymentSettings.creditCardFeeRate / 100))
                      : formatPrice(paymentSettings.creditCardFeeFixed)
                    }
                  </span>
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold text-lg">
                  <span>合計</span>
                  <span>{formatPrice(calculateFinalTotal())}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>※ 注文確定後、在庫状況により商品をご用意できない場合があります。</p>
              <p>※ 配送は通常3-5営業日でお届けいたします。</p>
            </div>
          </div>
      </div>
    </div>
  )
}