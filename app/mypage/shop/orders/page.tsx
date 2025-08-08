'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
  totalAmount: number
  status: string
  shippingAddress: string | null
  notes?: string | null
  orderedAt?: string
  createdAt: string
  orderItems: OrderItem[]
}



export default function OrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      const response = await fetch(`/api/orders?${params}`)
      
      if (!response.ok) {
        throw new Error('注文履歴の取得に失敗しました')
      }

      const data = await response.json()
      setOrders(data.orders || [])
      setCurrentPage(data.currentPage || 1)
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.totalCount || 0)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setError(error instanceof Error ? error.message : '注文履歴の取得に失敗しました')
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
      fetchOrders()
    } else if (session?.user?.userType === 'admin') {
      router.push('/dashboard')
    } else if (session === null) {
      // セッションが明示的にnullの場合のみログインページにリダイレクト
      router.push('/login')
    }
  }, [fetchOrders, session, router])


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

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('本当にこの注文をキャンセルしますか？')) {
      return
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '注文のキャンセルに失敗しました')
      }

      await fetchOrders(currentPage) // リストを更新
      alert('注文をキャンセルしました')
    } catch (error) {
      console.error('Error cancelling order:', error)
      alert(error instanceof Error ? error.message : '注文のキャンセルに失敗しました')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { text: '出荷前', class: 'bg-yellow-100 text-yellow-800' },
      'SHIPPED': { text: '出荷済み', class: 'bg-green-100 text-green-800' },
      'BACKORDERED': { text: '入荷待ち', class: 'bg-blue-100 text-blue-800' },
      'CANCELLED': { text: 'キャンセル', class: 'bg-red-100 text-red-800' },
      'COMPLETED': { text: '完了', class: 'bg-purple-100 text-purple-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['PENDING']
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.class}`}>
        {config.text}
      </span>
    )
  }

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/mypage/shop" className="text-sm text-blue-600 hover:text-blue-500">
          ← ショッピングを続ける
        </Link>
      </div>
      
      {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">注文履歴がありません</h3>
            <p className="text-gray-600 mb-6">まだ注文をされていません</p>
            <Link href="/mypage/shop">
              <Button>ショッピングを始める</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          注文番号: {order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          注文日: {formatDate(order.orderedAt || order.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {order.orderItems.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex items-center space-x-3">
                            {item.product.imageUrl && (
                              <img
                                src={item.product.imageUrl}
                                alt={item.productName}
                                className="h-12 w-12 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {item.productName}
                              </p>
                              <p className="text-sm text-gray-600">
                                {formatPrice(item.price)} × {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}
                        {order.orderItems.length > 3 && (
                          <div className="flex items-center justify-center text-sm text-gray-500">
                            他 {order.orderItems.length - 3} 点
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <div>
                        {(order.status === 'SHIPPED' || order.status === 'COMPLETED') && (
                          <span className="text-sm text-gray-600">
                            {order.status === 'SHIPPED' ? '出荷済みのためキャンセルできません' : '完了済みのためキャンセルできません'}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Link href={`/mypage/shop/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            詳細を見る
                          </Button>
                        </Link>
                        {order.status !== 'SHIPPED' && order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            キャンセル
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    onClick={() => fetchOrders(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    variant="outline"
                    size="sm"
                  >
                    前へ
                  </Button>
                  <Button
                    onClick={() => fetchOrders(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    variant="outline"
                    size="sm"
                  >
                    次へ
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{totalCount}</span>
                      件中{' '}
                      <span className="font-medium">
                        {(currentPage - 1) * 10 + 1}
                      </span>
                      -{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * 10, totalCount)}
                      </span>
                      件を表示
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => fetchOrders(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                      variant="outline"
                      size="sm"
                    >
                      前へ
                    </Button>
                    <Button
                      onClick={() => fetchOrders(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                      variant="outline"
                      size="sm"
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
    </div>
  )
}