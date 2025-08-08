'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface RecentOrdersProps {
  className?: string
}

interface OrderData {
  id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  status: string
  createdAt: string
}

export default function RecentOrders({ className }: RecentOrdersProps) {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderData[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRecentOrders()
  }, [])

  const fetchRecentOrders = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/orders?limit=5')
      if (!response.ok) {
        throw new Error('注文データの取得に失敗しました')
      }

      const result = await response.json()
      setOrders(result.orders || [])
    } catch (error) {
      console.error('Error fetching recent orders:', error)
      setError(error instanceof Error ? error.message : '注文データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { label: '保留中', color: 'bg-yellow-100 text-yellow-800' },
      'CONFIRMED': { label: '確認済み', color: 'bg-blue-100 text-blue-800' },
      'PROCESSING': { label: '処理中', color: 'bg-indigo-100 text-indigo-800' },
      'SHIPPED': { label: '出荷済み', color: 'bg-green-100 text-green-800' },
      'DELIVERED': { label: '配達済み', color: 'bg-green-100 text-green-800' },
      'CANCELLED': { label: 'キャンセル', color: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { label: status, color: 'bg-gray-100 text-gray-800' }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="flex justify-center items-center h-32">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">📦 最近の注文</h2>
        <div className="flex gap-2">
          <Button 
            onClick={fetchRecentOrders} 
            variant="ghost" 
            size="sm"
            disabled={loading}
          >
            🔄
          </Button>
          <Link href="/dashboard/orders">
            <Button variant="outline" size="sm">
              全て見る
            </Button>
          </Link>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📦</div>
          <p>注文がありません</p>
          <p className="text-sm">新しい注文が入ると、ここに表示されます。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900 truncate">
                    {order.orderNumber}
                  </span>
                  {getStatusBadge(order.status)}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  {order.customerName} • {formatDate(order.createdAt)}
                </div>
              </div>
              <div className="text-right ml-2">
                <div className="font-semibold text-sm text-gray-900">
                  {formatCurrency(order.totalAmount)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}