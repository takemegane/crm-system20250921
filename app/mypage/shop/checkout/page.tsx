'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

type SystemSettings = {
  systemName: string
  primaryColor?: string
  secondaryColor?: string
  backgroundColor?: string
}

export default function CheckoutPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [cart, setCart] = useState<Cart>({ items: [], total: 0, itemCount: 0 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    shippingAddress: '',
    recipientName: '',
    contactPhone: '',
    notes: ''
  })
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ systemName: 'ECショップ' })
  const [customerProfile, setCustomerProfile] = useState<any>(null)
  const [addressSelection, setAddressSelection] = useState<'new' | 'profile'>('new')
  const [shippingInfo, setShippingInfo] = useState<{
    shippingFee: number
    originalShippingFee: number
    freeShippingThreshold: number | null
    isShippingFree: boolean
    totalAmount: number
  } | null>(null)

  const fetchCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart')
      
      if (!response.ok) {
        throw new Error('カートの取得に失敗しました')
      }

      const data = await response.json()
      setCart(data)
      
      // カートが空の場合はカート画面にリダイレクト
      if (data.items.length === 0) {
        router.push('/mypage/shop/cart')
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
      setError(error instanceof Error ? error.message : 'カートの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (session === undefined) {
      // セッション読み込み中は何もしない
      return
    }
    
    if (session?.user?.userType === 'customer') {
      fetchCart()
      fetchCustomerProfile()
      
      // 顧客情報から配送先住所を初期設定は後でcustomerProfileから行う
    } else if (session?.user?.userType === 'admin') {
      router.push('/dashboard')
    } else if (session === null) {
      // セッションが明示的にnullの場合のみログインページにリダイレクト
      router.push('/login')
    }
  }, [fetchCart, session, router])

  const fetchCustomerProfile = async () => {
    try {
      const response = await fetch('/api/customer-profile')
      if (response.ok) {
        const profile = await response.json()
        setCustomerProfile(profile)
        // 顧客名と電話番号をデフォルトとして設定
        setFormData(prev => ({
          ...prev,
          recipientName: profile.name || '',
          contactPhone: profile.phone || ''
        }))
      }
    } catch (error) {
      console.error('Error fetching customer profile:', error)
    }
  }

  const calculateShipping = useCallback(async () => {
    if (cart.items.length === 0) {
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
  }, [cart.items, cart.total])

  // システム設定を取得
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await fetch('/api/system-settings')
        if (response.ok) {
          const settings = await response.json()
          setSystemSettings(settings)
        }
      } catch (error) {
        console.error('Error fetching system settings:', error)
      }
    }
    fetchSystemSettings()
  }, [])

  // カート更新時に送料を再計算
  useEffect(() => {
    if (cart.items.length > 0 && session?.user?.userType === 'customer') {
      calculateShipping()
    }
  }, [cart.items, cart.total, calculateShipping, session?.user?.userType])

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
      
      // 購入完了ポップアップ表示
      alert('🎉 購入が完了しました！\n\nありがとうございます！\n注文詳細画面に移動します。')
      
      // 注文完了画面にリダイレクト
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
        shippingAddress: customerProfile.address
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {systemSettings?.logoUrl ? (
                <div className="h-10 w-10 rounded-xl overflow-hidden mr-3 shadow-lg">
                  <img
                    src={systemSettings.logoUrl}
                    alt={systemSettings.systemName}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mr-3 shadow-lg"
                     style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)' }}>
                  <span className="text-white font-bold text-lg">
                    {systemSettings?.systemName?.charAt(0) || 'S'}
                  </span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{systemSettings.systemName}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                こんにちは、{session?.user?.name}さん
              </span>
              <Link href="/mypage/shop/cart">
                <Button variant="outline">カート</Button>
              </Link>
              <Link href="/mypage/shop/orders">
                <Button variant="outline">注文履歴</Button>
              </Link>
              <Link href="/mypage/profile">
                <Button variant="outline">アカウント</Button>
              </Link>
              <Link href="/mypage">
                <Button variant="outline">🏠 マイページ</Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

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
                  disabled={addressSelection === 'profile' && customerProfile?.address}
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">お支払い方法</h3>
                <p className="text-sm text-blue-700">
                  現在は代金引換のみとなっております。<br />
                  商品受け取り時に配送業者にお支払いください。
                </p>
              </div>

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
              {cart.items.map((item) => (
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
                <span>小計 ({cart.itemCount}点)</span>
                <span>{formatPrice(cart.total)}</span>
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
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold text-lg">
                  <span>合計</span>
                  <span>
                    {shippingInfo 
                      ? formatPrice(shippingInfo.totalAmount)
                      : formatPrice(cart.total)
                    }
                  </span>
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
    </div>
  )
}