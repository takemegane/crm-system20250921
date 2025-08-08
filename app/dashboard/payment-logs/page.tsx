'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'

interface PaymentLog {
  id: string
  orderNumber: string
  customerId: string
  totalAmount: number
  paymentMethod: string | null
  stripePaymentIntentId: string | null
  stripeSessionId: string | null
  paidAt: string | null
  status: string
  paymentStatus: 'completed' | 'pending' | 'failed'
  createdAt: string
  updatedAt: string
  customer: {
    name: string
    email: string
  } | null
}

interface PaymentLogsResponse {
  paymentLogs: PaymentLog[]
  pagination: {
    currentPage: number
    totalPages: number
    totalCount: number
    limit: number
  }
  statistics: {
    completedPayments: number
    pendingPayments: number
    failedPayments: number
    totalRevenue: number
    paymentMethods: Array<{
      method: string
      count: number
      totalAmount: number
    }>
  }
  filters: {
    status: string | null
    paymentMethod: string | null
    sortBy: string
    sortOrder: string
  }
}

export default function PaymentLogsPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<PaymentLogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // フィルター状態
  const [status, setStatus] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const limit = 10

  const fetchPaymentLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      })
      
      if (status) params.append('status', status)
      if (paymentMethod) params.append('paymentMethod', paymentMethod)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const response = await fetch(`/api/payment-logs?${params}`)
      
      if (!response.ok) {
        throw new Error('決済ログの取得に失敗しました')
      }
      
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      console.error('Payment logs error:', err)
      setError(err instanceof Error ? err.message : '決済ログの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentLogs()
  }, [status, paymentMethod, sortBy, sortOrder, currentPage, startDate, endDate])

  const handleCsvExport = async () => {
    try {
      const params = new URLSearchParams({
        export: 'csv',
        sortBy,
        sortOrder
      })
      
      if (status) params.append('status', status)
      if (paymentMethod) params.append('paymentMethod', paymentMethod)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      
      const response = await fetch(`/api/payment-logs?${params}`)
      
      if (!response.ok) {
        throw new Error('CSV出力に失敗しました')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `payment_logs_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('CSV export error:', err)
      setError(err instanceof Error ? err.message : 'CSV出力に失敗しました')
    }
  }

  // 権限チェック
  if (!session || !hasPermission(session.user.role as any, 'VIEW_PAYMENT_LOGS')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス権限がありません</h1>
          <p className="text-gray-600">決済ログを表示する権限がありません。</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">エラーが発生しました</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchPaymentLogs}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  const getStatusBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'completed':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">完了</span>
      case 'pending':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">保留中</span>
      case 'failed':
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">失敗</span>
      default:
        return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">不明</span>
    }
  }

  const getPaymentMethodName = (method: string | null) => {
    switch (method) {
      case 'stripe':
        return 'クレジットカード'
      case 'bank_transfer':
        return '銀行振込'
      case 'cash_on_delivery':
        return '代引き'
      case 'cod':
        return '代引き'
      default:
        return '未設定'
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const renderPagination = () => {
    const { currentPage, totalPages } = data.pagination
    const pages: number[] = []
    
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            前へ
          </button>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            次へ
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{data.pagination.totalCount}</span> 件中{' '}
              <span className="font-medium">{(currentPage - 1) * limit + 1}</span> から{' '}
              <span className="font-medium">{Math.min(currentPage * limit, data.pagination.totalCount)}</span> を表示
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              {pages.map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                    page === currentPage
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  } ${page === pages[0] ? 'rounded-l-md' : ''} ${page === pages[pages.length - 1] ? 'rounded-r-md' : ''}`}
                >
                  {page}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">決済ログ</h1>
          <p className="text-gray-600">決済履歴と統計情報を確認できます</p>
        </div>
        <button
          onClick={handleCsvExport}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <span className="text-lg">📊</span>
          CSV出力
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">✅</div>
            <div>
              <p className="text-sm font-medium text-gray-600">完了済み決済</p>
              <p className="text-2xl font-bold text-green-600">{data.statistics.completedPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">⏳</div>
            <div>
              <p className="text-sm font-medium text-gray-600">保留中決済</p>
              <p className="text-2xl font-bold text-yellow-600">{data.statistics.pendingPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">❌</div>
            <div>
              <p className="text-sm font-medium text-gray-600">失敗済み決済</p>
              <p className="text-2xl font-bold text-red-600">{data.statistics.failedPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="text-3xl mr-4">💰</div>
            <div>
              <p className="text-sm font-medium text-gray-600">総売上</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.statistics.totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">決済状態</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">全て</option>
              <option value="completed">完了</option>
              <option value="pending">保留中</option>
              <option value="failed">失敗</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">決済方法</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">全て</option>
              <option value="stripe">クレジットカード</option>
              <option value="bank_transfer">銀行振込</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="createdAt">作成日時</option>
              <option value="paidAt">決済日時</option>
              <option value="totalAmount">金額</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">昇順/降順</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="desc">降順</option>
              <option value="asc">昇順</option>
            </select>
          </div>
        </div>
      </div>

      {/* 決済ログテーブル */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注文番号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">顧客</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">金額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">決済方法</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状態</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">決済日時</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日時</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.paymentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{log.orderNumber}</div>
                    {log.stripePaymentIntentId && (
                      <div className="text-xs text-gray-500">PI: {log.stripePaymentIntentId.substring(0, 20)}...</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.customer ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.customer.name}</div>
                        <div className="text-sm text-gray-500">{log.customer.email}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">顧客情報なし</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(log.totalAmount)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{getPaymentMethodName(log.paymentMethod)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(log.paymentStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {log.paidAt ? formatDate(log.paidAt) : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{formatDate(log.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderPagination()}
      </div>

      {/* 決済方法別統計 */}
      {data.statistics.paymentMethods.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">決済方法別統計</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.statistics.paymentMethods.map((method, index) => (
              <div key={method.method || 'unknown'} className="border rounded-lg p-4">
                <h4 className="font-medium text-gray-900">{getPaymentMethodName(method.method)}</h4>
                <p className="text-sm text-gray-600 mt-1">件数: {method.count}</p>
                <p className="text-sm text-gray-600">合計: {formatCurrency(method.totalAmount)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}