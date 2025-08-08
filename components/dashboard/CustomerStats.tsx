'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface CustomerStatsProps {
  className?: string
}

interface CustomerStatsData {
  totalCustomers: number
  activeCustomers: number
  newThisMonth: number
  newThisWeek: number
  archivedCustomers: number
  topCustomers: Array<{
    id: string
    name: string
    email: string
    totalOrders: number
    totalSpent: number
  }>
}

export default function CustomerStats({ className }: CustomerStatsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<CustomerStatsData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchCustomerStats()
  }, [])

  const fetchCustomerStats = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/customer-stats')
      if (!response.ok) {
        throw new Error('顧客統計の取得に失敗しました')
      }

      const result = await response.json()
      setData(result.data)
    } catch (error) {
      console.error('Error fetching customer stats:', error)
      setError(error instanceof Error ? error.message : '顧客統計の取得に失敗しました')
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

  if (!data) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
        <div className="text-center">
          <div className="text-gray-400 text-4xl mb-2">👥</div>
          <p className="text-gray-500">データがありません</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">👥 顧客統計</h2>
        <div className="flex gap-2">
          <Button 
            onClick={fetchCustomerStats} 
            variant="ghost" 
            size="sm"
            disabled={loading}
          >
            🔄
          </Button>
          <Link href="/dashboard/customers">
            <Button variant="outline" size="sm">
              管理
            </Button>
          </Link>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-xl font-bold text-blue-700">{data.totalCustomers}</div>
          <div className="text-xs text-blue-600">総顧客数</div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-xl font-bold text-green-700">{data.activeCustomers}</div>
          <div className="text-xs text-green-600">アクティブ</div>
        </div>
        
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-xl font-bold text-orange-700">{data.newThisMonth}</div>
          <div className="text-xs text-orange-600">今月新規</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-xl font-bold text-purple-700">{data.newThisWeek}</div>
          <div className="text-xs text-purple-600">今週新規</div>
        </div>
      </div>

      {/* 上位顧客 */}
      {data.topCustomers && data.topCustomers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">💎 上位顧客</h3>
          <div className="space-y-2">
            {data.topCustomers.slice(0, 3).map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${
                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{customer.name}</div>
                    <div className="text-xs text-gray-500 truncate">{customer.email}</div>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="text-xs font-semibold text-gray-900">
                    {formatCurrency(customer.totalSpent)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {customer.totalOrders}件
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}