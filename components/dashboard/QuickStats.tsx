'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface QuickStatsProps {
  className?: string
}

interface StatsData {
  totalCustomers: number
  totalOrders: number
  totalSales: number
  newCustomersThisMonth: number
}

export default function QuickStats({ className }: QuickStatsProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StatsData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch('/api/quick-stats')
      if (!response.ok) {
        throw new Error('統計データの取得に失敗しました')
      }

      const result = await response.json()
      setData(result.data)
    } catch (error) {
      console.error('Error fetching quick stats:', error)
      setError(error instanceof Error ? error.message : '統計データの取得に失敗しました')
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
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-gray-500">データがありません</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">📊 クイック統計</h2>
        <Button 
          onClick={fetchStats} 
          variant="ghost" 
          size="sm"
          disabled={loading}
        >
          🔄
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">{data.totalCustomers}</div>
          <div className="text-xs text-blue-600">総顧客数</div>
          <Link href="/dashboard/customers">
            <Button variant="ghost" size="sm" className="mt-1 text-xs">
              詳細
            </Button>
          </Link>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-700">{data.totalOrders}</div>
          <div className="text-xs text-green-600">総注文数</div>
          <Link href="/dashboard/orders">
            <Button variant="ghost" size="sm" className="mt-1 text-xs">
              詳細
            </Button>
          </Link>
        </div>
        
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-lg font-bold text-orange-700">{formatCurrency(data.totalSales)}</div>
          <div className="text-xs text-orange-600">総売上</div>
        </div>
        
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-700">{data.newCustomersThisMonth}</div>
          <div className="text-xs text-purple-600">今月新規顧客</div>
        </div>
      </div>
    </div>
  )
}