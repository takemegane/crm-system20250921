'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

type ReportType = 'summary' | 'daily' | 'monthly' | 'product' | 'customer'

interface SalesReportProps {
  className?: string
}

interface SummaryData {
  totalOrders: number
  totalSales: number
  totalShipping: number
  avgOrderValue: number
  thisMonthSales: number
  thisMonthOrders: number
  lastMonthSales: number
  lastMonthOrders: number
  salesGrowth: number
}

interface DailyData {
  date: string
  totalSales: number
  orderCount: number
  totalShipping: number
}

interface MonthlyData {
  month: string
  totalSales: number
  orderCount: number
  totalShipping: number
}

interface ProductData {
  productName: string
  totalSales: number
  totalQuantity: number
  orderCount: number
}

interface CustomerData {
  customerId: string
  customerName: string
  customerEmail: string
  totalSales: number
  orderCount: number
  rank: number
}

export default function SalesReport({ className }: SalesReportProps) {
  const [reportType, setReportType] = useState<ReportType>('summary')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<any>(null)
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })

  const fetchReport = async (type: ReportType = reportType) => {
    setLoading(true)
    setError('')
    
    try {
      console.log('📊 Fetching sales report:', { type, dateRange })
      
      const params = new URLSearchParams({ type })
      if (dateRange.startDate) params.append('startDate', dateRange.startDate)
      if (dateRange.endDate) params.append('endDate', dateRange.endDate)
      
      const url = `/api/sales-report?${params.toString()}`
      console.log('📊 API URL:', url)
      
      const response = await fetch(url)
      console.log('📊 API Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('📊 API Error:', errorData)
        throw new Error(errorData.error || `HTTP ${response.status}: レポートの取得に失敗しました`)
      }
      
      const result = await response.json()
      console.log('📊 API Response data:', result)
      
      if (!result || typeof result !== 'object') {
        throw new Error('不正なレスポンス形式です')
      }
      
      setData(result.data)
    } catch (error) {
      console.error('📊 Error fetching sales report:', error)
      const errorMessage = error instanceof Error ? error.message : 'レポートの取得に失敗しました'
      setError(`${errorMessage}\n\nブラウザのコンソールで詳細なエラー情報を確認できます。`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [reportType])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  const handleTypeChange = (type: ReportType) => {
    setReportType(type)
  }

  const renderSummary = (summaryData: SummaryData) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900">総売上</h4>
        <p className="text-2xl font-bold text-blue-700">{formatCurrency(summaryData.totalSales)}</p>
        <p className="text-xs text-blue-600">送料込み: {formatCurrency(summaryData.totalSales + summaryData.totalShipping)}</p>
      </div>
      
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h4 className="text-sm font-medium text-green-900">総注文数</h4>
        <p className="text-2xl font-bold text-green-700">{summaryData.totalOrders.toLocaleString()}</p>
        <p className="text-xs text-green-600">平均注文額: {formatCurrency(summaryData.avgOrderValue)}</p>
      </div>
      
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h4 className="text-sm font-medium text-orange-900">今月売上</h4>
        <p className="text-2xl font-bold text-orange-700">{formatCurrency(summaryData.thisMonthSales)}</p>
        <p className="text-xs text-orange-600">注文数: {summaryData.thisMonthOrders}</p>
      </div>
      
      <div className={`p-4 rounded-lg border ${summaryData.salesGrowth >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <h4 className={`text-sm font-medium ${summaryData.salesGrowth >= 0 ? 'text-green-900' : 'text-red-900'}`}>前月比成長率</h4>
        <p className={`text-2xl font-bold ${summaryData.salesGrowth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
          {summaryData.salesGrowth > 0 ? '+' : ''}{summaryData.salesGrowth.toFixed(1)}%
        </p>
        <p className={`text-xs ${summaryData.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          先月: {formatCurrency(summaryData.lastMonthSales)}
        </p>
      </div>
    </div>
  )

  const renderDaily = (dailyData: DailyData[]) => {
    console.log('📊 renderDaily called with:', dailyData)
    
    if (!Array.isArray(dailyData)) {
      console.error('📊 dailyData is not an array:', dailyData)
      return <div className="text-red-600">データ形式エラー: 日別データが配列ではありません</div>
    }
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
          <div>日付</div>
          <div>売上</div>
          <div>注文数</div>
          <div>送料</div>
        </div>
        {dailyData.map((item) => (
          <div key={item.date} className="grid grid-cols-4 gap-4 text-sm py-2 hover:bg-gray-50 rounded">
            <div>{formatDate(item.date)}</div>
            <div className="font-medium">{formatCurrency(item.totalSales)}</div>
            <div>{item.orderCount}</div>
            <div>{formatCurrency(item.totalShipping)}</div>
          </div>
        ))}
      </div>
    )
  }

  const renderMonthly = (monthlyData: MonthlyData[]) => {
    console.log('📊 renderMonthly called with:', monthlyData)
    
    if (!Array.isArray(monthlyData)) {
      console.error('📊 monthlyData is not an array:', monthlyData)
      return <div className="text-red-600">データ形式エラー: 月別データが配列ではありません</div>
    }
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
          <div>月</div>
          <div>売上</div>
          <div>注文数</div>
          <div>送料</div>
        </div>
        {monthlyData.map((item) => (
          <div key={item.month} className="grid grid-cols-4 gap-4 text-sm py-2 hover:bg-gray-50 rounded">
            <div>{item.month}</div>
            <div className="font-medium">{formatCurrency(item.totalSales)}</div>
            <div>{item.orderCount}</div>
            <div>{formatCurrency(item.totalShipping)}</div>
          </div>
        ))}
      </div>
    )
  }

  const renderProduct = (productData: ProductData[]) => {
    console.log('📊 renderProduct called with:', productData)
    
    if (!Array.isArray(productData)) {
      console.error('📊 productData is not an array:', productData)
      return <div className="text-red-600">データ形式エラー: 商品別データが配列ではありません</div>
    }
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
          <div>商品名</div>
          <div>売上</div>
          <div>販売数</div>
          <div>注文回数</div>
        </div>
        {productData.map((item, index) => (
          <div key={item.productName} className="grid grid-cols-4 gap-4 text-sm py-2 hover:bg-gray-50 rounded">
            <div className="truncate" title={item.productName}>
              <span className="text-xs text-gray-500">#{index + 1}</span> {item.productName}
            </div>
            <div className="font-medium">{formatCurrency(item.totalSales)}</div>
            <div>{item.totalQuantity}</div>
            <div>{item.orderCount}</div>
          </div>
        ))}
      </div>
    )
  }

  const renderCustomer = (customerData: CustomerData[]) => {
    console.log('📊 renderCustomer called with:', customerData)
    
    if (!Array.isArray(customerData)) {
      console.error('📊 customerData is not an array:', customerData)
      return <div className="text-red-600">データ形式エラー: 顧客別データが配列ではありません</div>
    }
    
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700 border-b pb-2">
          <div>順位</div>
          <div>顧客名</div>
          <div>メールアドレス</div>
          <div>売上</div>
          <div>注文数</div>
        </div>
        {customerData.map((item) => (
          <div key={item.customerId} className="grid grid-cols-5 gap-4 text-sm py-2 hover:bg-gray-50 rounded">
            <div className="flex items-center">
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                item.rank === 1 ? 'bg-yellow-100 text-yellow-800' :
                item.rank === 2 ? 'bg-gray-100 text-gray-700' :
                item.rank === 3 ? 'bg-orange-100 text-orange-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {item.rank}
              </span>
            </div>
            <div className="truncate">{item.customerName}</div>
            <div className="truncate text-gray-600">{item.customerEmail}</div>
            <div className="font-medium">{formatCurrency(item.totalSales)}</div>
            <div>{item.orderCount}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 sm:mb-0">📊 売上レポート</h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* 日付範囲選択 */}
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              placeholder="開始日"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
              placeholder="終了日"
            />
            <Button
              onClick={() => fetchReport()}
              size="sm"
              variant="outline"
              disabled={loading}
            >
              更新
            </Button>
          </div>
        </div>
      </div>

      {/* レポートタイプ選択 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'summary' as const, label: '概要' },
          { key: 'daily' as const, label: '日別' },
          { key: 'monthly' as const, label: '月別' },
          { key: 'product' as const, label: '商品別' },
          { key: 'customer' as const, label: '顧客別' }
        ].map((type) => (
          <button
            key={type.key}
            onClick={() => handleTypeChange(type.key)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              reportType === type.key
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* ローディング表示 */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      )}

      {/* データ表示 */}
      {!loading && data && (
        <div className="min-h-64">
          {reportType === 'summary' && renderSummary(data)}
          {reportType === 'daily' && renderDaily(data)}
          {reportType === 'monthly' && renderMonthly(data)}
          {reportType === 'product' && renderProduct(data)}
          {reportType === 'customer' && renderCustomer(data)}
        </div>
      )}

      {/* データがない場合 */}
      {!loading && !error && (!data || (Array.isArray(data) && data.length === 0)) && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📈</div>
          <p>データがありません</p>
          <p className="text-sm">指定した期間に注文がないか、まだデータが蓄積されていません。</p>
        </div>
      )}
    </div>
  )
}