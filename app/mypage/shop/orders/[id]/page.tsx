'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type OrderItem = {
  id: string
  productName: string
  price: number
  quantity: number
  subtotal: number
  product: {
    id: string
    name: string
    imageUrl?: string
  }
}

type Order = {
  id: string
  orderNumber: string
  subtotalAmount: number
  shippingFee: number
  codFee?: number
  totalAmount: number
  status: string
  shippingAddress: string | null
  recipientName: string | null
  contactPhone: string | null
  notes: string | null
  paymentMethod?: string | null
  orderedAt: string
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancelReason?: string | null
  orderItems: OrderItem[]
}

const ORDER_STATUS = {
  PENDING: '出荷前',
  SHIPPED: '出荷済み',
  BACKORDERED: '入荷待ち',
  CANCELLED: 'キャンセル',
  COMPLETED: '完了'
} as const

const PAYMENT_METHOD_LABELS = {
  'stripe': 'クレジットカード',
  'bank_transfer': '銀行振込',
  'cash_on_delivery': '代引き',
  'cod': '代引き'  // 互換性のため
} as const

const ORDER_STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SHIPPED: 'bg-green-100 text-green-800',
  BACKORDERED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-purple-100 text-purple-800'
} as const


export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const isCompleted = searchParams.get('completed') === 'true'

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('注文が見つかりません')
        } else {
          throw new Error('注文の取得に失敗しました')
        }
        return
      }

      const data = await response.json()
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
      setError(error instanceof Error ? error.message : '注文の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (session === undefined) {
      // セッション読み込み中は何もしない
      return
    }
    
    if (session?.user?.userType === 'customer') {
      fetchOrder()
    } else if (session?.user?.userType === 'admin') {
      router.push('/dashboard')
    } else if (session === null) {
      // セッションが明示的にnullの場合のみログインページにリダイレクト
      router.push('/login')
    }
  }, [session, router, params.id, fetchOrder])

  // 購入完了パラメータチェック
  const [showThankYou, setShowThankYou] = useState(false)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('completed') === 'true') {
      setShowThankYou(true)
    }
  }, [])


  const handleCancelOrder = async () => {
    console.log('🔥🔥🔥 COMPLETELY NEW handleCancelOrder called, order:', order?.id)
    
    if (!order) {
      console.log('❌ No order found')
      alert('注文情報が見つかりません')
      return
    }
    
    if (!confirm('本当にこの注文をキャンセルしますか？')) {
      console.log('❌ User cancelled confirmation')
      return
    }

    console.log('🚀🚀🚀 COMPLETELY NEW Starting cancel process for order:', order.id)
    setCancelling(true)
    
    try {
      console.log('📡📡📡 COMPLETELY NEW Making PUT API call to cancel order:', order.id)
      
      // 絶対的にPUTメソッドを指定
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'cancel' })
      })

      console.log('🌐 Cancel API response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        let errorMessage = '注文のキャンセルに失敗しました'
        try {
          const errorData = await response.json()
          console.log('❌ Error response:', errorData)
          errorMessage = errorData.error?.message || errorData.error || errorMessage
        } catch (jsonError) {
          console.log('❌ Error response JSON parse failed')
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // 成功レスポンスの処理
      const result = await response.json()
      console.log('✅ Success response:', result)
      
      if (result.success) {
        console.log('✅ Cancel successful:', result.message)
      } else {
        throw new Error('キャンセル処理が完了しませんでした')
      }

      await fetchOrder() // 最新状態を取得
      alert('注文をキャンセルしました')
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert(error instanceof Error ? error.message : '注文のキャンセルに失敗しました')
    } finally {
      setCancelling(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const canCancel = order && order.status !== 'SHIPPED' && order.status !== 'CANCELLED' && order.status !== 'COMPLETED'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
        <div className="text-center">
          <Link href="/mypage/shop/orders">
            <Button>注文履歴に戻る</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">注文が見つかりません</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 購入完了時の感謝メッセージ */}
        {showThankYou && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center mb-6">
            <div className="text-2xl font-bold text-green-800 mb-2">
              🎉 ありがとうございます！
            </div>
            <h3 className="text-lg font-medium text-green-700 mb-2">注文が完了しました！</h3>
            <p className="text-green-600">
              ご注文を承りました。商品の準備が整い次第、発送させていただきます。
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* 注文基本情報 */}
          <div className="border-b pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  注文番号: {order.orderNumber}
                </h2>
                <p className="text-sm text-gray-600">
                  注文日時: {formatDate(order.orderedAt)}
                </p>
                {order.status === 'CANCELLED' && order.cancelledAt && (
                  <div className="mt-2">
                    <p className="text-sm text-red-600">
                      キャンセル日時: {formatDate(order.cancelledAt)}
                    </p>
                    {order.cancelledBy && (
                      <p className="text-sm text-red-600">
                        {order.cancelledBy === 'CUSTOMER' ? '顧客キャンセル' : '管理者キャンセル'}
                        {order.cancelReason && ` (${order.cancelReason})`}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                  {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]}
                </span>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 注文商品 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">注文商品</h3>
            <div className="space-y-4">
              {order.orderItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                  {item.product.imageUrl && (
                    <img
                      src={item.product.imageUrl}
                      alt={item.productName}
                      className="h-16 w-16 object-cover rounded"
                    />
                  )}
                  
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {item.productName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {formatPrice(item.price)} × {item.quantity}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice(item.subtotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 金額内訳 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">金額内訳</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>商品小計:</span>
                <span>{formatPrice(order.orderItems.reduce((sum, item) => sum + item.subtotal, 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>送料:</span>
                <span>{formatPrice(order.shippingFee || 0)}</span>
              </div>
              {order.codFee && order.codFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span>
                    {order.paymentMethod === 'cash_on_delivery' || order.paymentMethod === 'cod' ? '代引き手数料:' :
                     order.paymentMethod === 'bank_transfer' ? '銀行振込手数料:' :
                     order.paymentMethod === 'stripe' ? 'クレジットカード手数料:' : '決済手数料:'}
                  </span>
                  <span>{formatPrice(order.codFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>支払い方法:</span>
                <span>{order.paymentMethod ? 
                  PAYMENT_METHOD_LABELS[order.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] || order.paymentMethod
                  : '未設定'}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t pt-2">
                <span>合計:</span>
                <span>{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* 配送情報 */}
          {order.shippingAddress && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">配送先情報</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {order.recipientName && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">宛名: </span>
                    <span className="text-sm">{order.recipientName}</span>
                  </div>
                )}
                {order.contactPhone && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">連絡先電話番号: </span>
                    <span className="text-sm">{order.contactPhone}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-600">住所: </span>
                  <div className="text-sm whitespace-pre-line mt-1">{order.shippingAddress}</div>
                </div>
              </div>
            </div>
          )}

          {/* 備考 */}
          {order.notes && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">備考・要望</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-line">{order.notes}</p>
              </div>
            </div>
          )}

          {/* アクション */}
          <div className="pt-6 border-t">
            <div className="flex space-x-4">
              <Link href="/mypage/shop">
                <Button variant="outline">ショッピングを続ける</Button>
              </Link>
              <Link href="/mypage/shop/orders">
                <Button variant="outline">注文履歴を見る</Button>
              </Link>
              {canCancel && (
                <Button
                  variant="outline"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  {cancelling ? 'キャンセル中...' : '注文をキャンセル'}
                </Button>
              )}
            </div>
          </div>
        </div>
    </div>
  )
}