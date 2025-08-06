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

export default function CartPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [cart, setCart] = useState<Cart>({ items: [], total: 0, itemCount: 0 })
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ systemName: 'ECショップ' })
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
    } catch (error) {
      console.error('Error fetching cart:', error)
      setError(error instanceof Error ? error.message : 'カートの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session === undefined) {
      // セッション読み込み中は何もしない
      return
    }
    
    if (session?.user?.userType === 'customer') {
      fetchCart()
    } else if (session?.user?.userType === 'admin') {
      router.push('/dashboard')
    } else if (session === null) {
      // セッションが明示的にnullの場合のみログインページにリダイレクト
      router.push('/login')
    }
  }, [fetchCart, session, router])

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

  const calculateShipping = useCallback(async () => {
    console.log('🛒 送料計算関数開始, カート件数:', cart.items.length)
    
    if (cart.items.length === 0) {
      console.log('📦 カートが空のため送料計算をスキップ')
      setShippingInfo(null)
      return
    }

    try {
      const cartItems = cart.items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }))

      console.log('📨 送料計算API呼び出し開始 - FIXED VERSION:', cartItems)

      const response = await fetch('/api/shipping-calc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cartItems
        })
      })

      console.log('📬 API応答受信:', response.status, response.statusText)

      if (response.ok) {
        const result = await response.json()
        console.log('📋 API応答内容:', result)
        
        // successResponse形式のレスポンスを処理
        if (result.success && result.data) {
          console.log('✅ successResponse形式で送料情報設定:', result.data)
          setShippingInfo(result.data)
        } else {
          // 古い形式のレスポンスも対応
          console.log('📄 legacy形式で送料情報設定:', result)
          setShippingInfo(result)
        }
      } else {
        console.error('❌ 送料計算に失敗しました:', response.status)
        const errorText = await response.text()
        console.error('❌ エラー詳細:', errorText)
        setShippingInfo(null)
      }
    } catch (error) {
      console.error('❌ 送料計算中にエラーが発生しました:', error)
      setShippingInfo(null)
    }
  }, [cart.items, cart.total])

  // カート更新時に送料を再計算
  useEffect(() => {
    if (cart.items.length > 0 && session?.user?.userType === 'customer') {
      calculateShipping()
    }
  }, [cart.items, cart.total, calculateShipping, session?.user?.userType])

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return

    setUpdating(itemId)
    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '更新に失敗しました')
      }

      await fetchCart()
    } catch (error) {
      console.error('Error updating cart:', error)
      alert(error instanceof Error ? error.message : '更新に失敗しました')
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: string) => {
    if (!confirm('この商品をカートから削除しますか？')) {
      return
    }

    setUpdating(itemId)
    try {
      const response = await fetch(`/api/cart/${itemId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '削除に失敗しました')
      }

      await fetchCart()
    } catch (error) {
      console.error('Error removing item:', error)
      alert(error instanceof Error ? error.message : '削除に失敗しました')
    } finally {
      setUpdating(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price)
  }

  const proceedToCheckout = () => {
    router.push('/mypage/shop/checkout')
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
              <Link href="/mypage">
                <Button variant="outline">🏠 マイページ</Button>
              </Link>
              <Link href="/mypage/shop" className="ml-2">
                <Button variant="outline">← ショップ</Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 ml-4">ショッピングカート</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                こんにちは、{session?.user?.name}さん
              </span>
              <Link href="/mypage/shop/orders">
                <Button variant="outline">注文履歴</Button>
              </Link>
              <Link href="/mypage/profile">
                <Button variant="outline">アカウント</Button>
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
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        ) : cart.items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">カートが空です</h3>
            <p className="text-gray-600 mb-6">商品を追加してください</p>
            <Link href="/mypage/shop">
              <Button>ショッピングを続ける</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    カート内商品 ({cart.itemCount}点)
                  </h2>
                  
                  <div className="space-y-4">
                    {cart.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                        {item.product.imageUrl && (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="h-16 w-16 object-cover rounded"
                          />
                        )}
                        
                        <div className="flex-1">
                          <h3 className="text-sm font-medium text-gray-900">
                            {item.product.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatPrice(item.product.price)}
                          </p>
                          <p className="text-xs text-gray-500">
                            在庫: {item.product.stock}個
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updating === item.id}
                            className="w-8 h-8 flex items-center justify-center border rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm">
                            {updating === item.id ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock || updating === item.id}
                            className="w-8 h-8 flex items-center justify-center border rounded text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatPrice(item.product.price * item.quantity)}
                          </p>
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={updating === item.id}
                            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">注文内容</h2>
                
                <div className="space-y-2 mb-4">
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
                    <div className="flex justify-between font-semibold">
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
                
                <Button
                  onClick={proceedToCheckout}
                  className="w-full"
                  disabled={cart.items.length === 0}
                >
                  レジに進む
                </Button>
                
                <div className="mt-4 text-center">
                  <Link href="/mypage/shop" className="text-sm text-blue-600 hover:text-blue-500">
                    ← ショッピングを続ける
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}