'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission, UserRole } from '@/lib/permissions'
import { useOrders, useUpdateOrderStatus } from '@/hooks/use-orders'

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
}

interface OrderItem {
  id: string
  productName: string
  price: number
  quantity: number
  subtotal: number
}

interface Order {
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
  customer: Customer
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

export default function OrdersPage() {
  const { data: session } = useSession()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [search, setSearch] = useState('')

  // キャッシュされたデータを使用（パラメータ対応は後で実装）
  const { data: ordersData, isLoading: ordersLoading, error: ordersError, refetch: refetchOrders } = useOrders()
  const updateOrderStatusMutation = useUpdateOrderStatus()

  // 現在はシンプルなフィルタリングを実装
  const orders = ordersData || []
  const filteredOrders = orders.filter((order: Order) => {
    const matchesSearch = !search || 
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(search.toLowerCase())
    
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // シンプルなページネーション
  const itemsPerPage = 10
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage)

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatusMutation.mutateAsync({ id: orderId, status: newStatus })
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
    } catch (error) {
      console.error('ステータス更新エラー:', error)
      alert(error instanceof Error ? error.message : 'ステータスの更新に失敗しました')
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedOrder(null)
  }

  if (ordersLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (ordersError) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-600">注文データの取得に失敗しました</div>
      </div>
    )
  }

  const canManage = session?.user?.role && hasPermission(session.user.role as UserRole, 'EDIT_ORDERS')

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">注文管理</h1>
      </div>

      {/* フィルター */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              検索（注文番号・顧客名・メールアドレス）
            </label>
            <input
              type="text"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="検索キーワードを入力"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">すべて</option>
              {Object.entries(ORDER_STATUS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => refetchOrders()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              更新
            </button>
          </div>
        </div>
      </div>

      {/* 注文一覧 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                操作
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                注文番号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                顧客情報
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                注文金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                注文日時
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedOrders.map((order: Order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {canManage && (
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {Object.entries(ORDER_STATUS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => openOrderDetail(order)}
                    className="text-blue-600 hover:text-blue-900 underline text-left"
                  >
                    <div className="text-sm font-medium text-blue-600">{order.orderNumber}</div>
                  </button>
                  <div className="text-sm text-gray-500">
                    {order.orderItems.length > 0 && (
                      <>
                        {order.orderItems[0].productName}
                        {order.orderItems.length > 1 && ` 他${order.orderItems.length - 1}件`}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{order.customer.name}</div>
                  <div className="text-sm text-gray-500">{order.customer.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(order.totalAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ORDER_STATUS_COLORS[order.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                      {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]}
                    </span>
                    {order.status === 'CANCELLED' && (
                      <div>
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
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(order.orderedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            注文が見つかりません
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              前へ
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* 注文詳細モーダル */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  注文詳細 - {selectedOrder.orderNumber}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 注文情報 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">注文情報</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">注文番号:</span>
                      <span className="font-medium">{selectedOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">注文日時:</span>
                      <span>{formatDate(selectedOrder.orderedAt)}</span>
                    </div>
                    {selectedOrder.status === 'CANCELLED' && selectedOrder.cancelledAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">キャンセル日時:</span>
                        <span className="text-red-600">{formatDate(selectedOrder.cancelledAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">ステータス:</span>
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ORDER_STATUS_COLORS[selectedOrder.status as keyof typeof ORDER_STATUS_COLORS]}`}>
                          {ORDER_STATUS[selectedOrder.status as keyof typeof ORDER_STATUS]}
                        </span>
                        {selectedOrder.status === 'CANCELLED' && (
                          <div>
                            {selectedOrder.cancelledBy ? (
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                selectedOrder.cancelledBy === 'CUSTOMER' 
                                  ? 'bg-orange-100 text-orange-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {selectedOrder.cancelledBy === 'CUSTOMER' ? '顧客キャンセル' : '管理者キャンセル'}
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                キャンセル
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">商品合計:</span>
                      <span className="font-medium">{formatPrice(selectedOrder.orderItems.reduce((sum, item) => sum + item.subtotal, 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">送料:</span>
                      <span>{formatPrice(selectedOrder.shippingFee || 0)}</span>
                    </div>
                    {selectedOrder.codFee && selectedOrder.codFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">代引き手数料:</span>
                        <span>{formatPrice(selectedOrder.codFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">支払い方法:</span>
                      <span>{selectedOrder.paymentMethod ? 
                        PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod as keyof typeof PAYMENT_METHOD_LABELS] || selectedOrder.paymentMethod
                        : '未設定'}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-gray-600 font-semibold">合計金額:</span>
                      <span className="font-medium text-lg">{formatPrice(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* 顧客情報 */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">顧客情報</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">お名前:</span>
                      <span className="font-medium">{selectedOrder.customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">メールアドレス:</span>
                      <span>{selectedOrder.customer.email}</span>
                    </div>
                    {selectedOrder.contactPhone && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">電話番号:</span>
                        <span>{selectedOrder.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 配送情報 */}
              {selectedOrder.shippingAddress && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">配送先情報</h4>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    {selectedOrder.recipientName && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">宛名: </span>
                        <span className="text-sm">{selectedOrder.recipientName}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-gray-600">住所: </span>
                      <div className="text-sm whitespace-pre-line mt-1">{selectedOrder.shippingAddress}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* 備考 */}
              {selectedOrder.notes && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-4">備考・要望</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-line">{selectedOrder.notes}</p>
                  </div>
                </div>
              )}

              {/* 注文商品 */}
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-900 mb-4">注文商品</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">商品名</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">単価</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">小計</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.orderItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.productName}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{formatPrice(item.price)}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatPrice(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ステータス変更 */}
              {canManage && (
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label htmlFor="statusChange" className="text-sm font-medium text-gray-700">
                        ステータス変更:
                      </label>
                      <select
                        id="statusChange"
                        value={selectedOrder.status}
                        onChange={(e) => handleStatusUpdate(selectedOrder.id, e.target.value)}
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        {Object.entries(ORDER_STATUS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={closeModal}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}