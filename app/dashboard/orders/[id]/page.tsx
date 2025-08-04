'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

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
  totalAmount: number
  status: string
  shippingAddress: string | null
  recipientName: string | null
  contactPhone: string | null
  notes: string | null
  orderedAt: string
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancelReason?: string | null
  customer: {
    id: string
    name: string
    email: string
    phone?: string
  }
  orderItems: OrderItem[]
}

const ORDER_STATUS = {
  PENDING: '出荷前',
  SHIPPED: '出荷済み',
  BACKORDERED: '入荷待ち',
  CANCELLED: 'キャンセル'
} as const

const ORDER_STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  SHIPPED: 'bg-green-100 text-green-800',
  BACKORDERED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800'
} as const

export default function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${params.id}`)
      
      if (!response.ok) {
        throw new Error('注文の取得に失敗しました')
      }

      const data = await response.json()
      // 単一の注文が返される場合
      if (data.orders && data.orders.length > 0) {
        setOrder(data.orders[0])
      } else if (data.id) {
        setOrder(data)
      } else {
        throw new Error('注文が見つかりません')
      }
    } catch (error) {
      console.error('Error fetching order:', error)
      setError(error instanceof Error ? error.message : '注文の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (session?.user?.userType === 'admin') {
      if (!hasPermission(session.user.role as UserRole, 'VIEW_ORDERS')) {
        router.push('/dashboard')
        return
      }
      fetchOrder()
    } else {
      router.push('/login')
    }
  }, [session, router, fetchOrder])

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('ステータスの更新に失敗しました')
      }

      await fetchOrder() // 注文情報を再取得
    } catch (error) {
      console.error('Error updating order status:', error)
      setError(error instanceof Error ? error.message : 'ステータスの更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">注文詳細</h1>
          <Link href="/dashboard/orders">
            <Button variant="outline">注文一覧に戻る</Button>
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || '注文が見つかりません'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">注文詳細</h1>
        <Link href="/dashboard/orders">
          <Button variant="outline">注文一覧に戻る</Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                注文番号: {order.orderNumber}
              </h2>
              <p className="text-sm text-gray-500">
                注文日時: {formatDate(order.orderedAt)}
              </p>
              {order.status === 'CANCELLED' && order.cancelledAt && (
                <div className="mt-2">
                  <p className="text-sm text-red-600">
                    キャンセル日時: {formatDate(order.cancelledAt)}
                  </p>
                  <p className="text-sm text-red-600">
                    {order.cancelledBy ? (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        order.cancelledBy === 'CUSTOMER' 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {order.cancelledBy === 'CUSTOMER' ? '顧客キャンセル' : '管理者キャンセル'}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        キャンセル
                      </span>
                    )}
                    {order.cancelReason && (
                      <span className="ml-2 text-gray-600">
                        {order.cancelReason}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]}
              </span>
            </div>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* 顧客情報 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">顧客情報</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-600">氏名: </span>
                <span className="text-sm">{order.customer.name}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">メールアドレス: </span>
                <span className="text-sm">{order.customer.email}</span>
              </div>
            </div>
          </div>

          {/* 配送情報 */}
          {order.shippingAddress && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">配送先情報</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {order.recipientName && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">宛名: </span>
                    <span className="text-sm">{order.recipientName}</span>
                  </div>
                )}
                {order.contactPhone && (
                  <div>
                    <span className="text-sm font-medium text-gray-600">電話番号: </span>
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

          {/* 注文商品 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">注文商品</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      商品
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      単価
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      数量
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      小計
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.orderItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          {item.product.imageUrl && (
                            <img
                              src={item.product.imageUrl}
                              alt={item.productName}
                              className="w-12 h-12 object-cover rounded mr-4"
                            />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {item.productName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {formatPrice(item.price)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {formatPrice(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 金額詳細 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">金額詳細</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">商品小計:</span>
                <span className="text-sm">{formatPrice(order.subtotalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-600">送料:</span>
                <span className="text-sm">{formatPrice(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-base font-semibold text-gray-900">合計:</span>
                <span className="text-base font-semibold text-gray-900">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* 備考 */}
          {order.notes && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">備考・要望</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-line">{order.notes}</p>
              </div>
            </div>
          )}

          {/* ステータス変更 */}
          {order.status !== 'CANCELLED' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">ステータス変更</h3>
              <div className="flex space-x-3">
                {order.status === 'PENDING' && (
                  <>
                    <Button
                      onClick={() => updateOrderStatus('SHIPPED')}
                      disabled={updating}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updating ? '更新中...' : '出荷済みにする'}
                    </Button>
                    <Button
                      onClick={() => updateOrderStatus('BACKORDERED')}
                      disabled={updating}
                      variant="outline"
                    >
                      {updating ? '更新中...' : '入荷待ちにする'}
                    </Button>
                    <Button
                      onClick={() => updateOrderStatus('CANCELLED')}
                      disabled={updating}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {updating ? '更新中...' : 'キャンセルする'}
                    </Button>
                  </>
                )}
                {order.status === 'BACKORDERED' && (
                  <>
                    <Button
                      onClick={() => updateOrderStatus('PENDING')}
                      disabled={updating}
                      variant="outline"
                    >
                      {updating ? '更新中...' : '出荷前に戻す'}
                    </Button>
                    <Button
                      onClick={() => updateOrderStatus('CANCELLED')}
                      disabled={updating}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {updating ? '更新中...' : 'キャンセルする'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}