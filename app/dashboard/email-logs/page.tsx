'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

type EmailLog = {
  id: string
  subject: string
  recipientEmail: string
  recipientName?: string
  status: string
  sentAt?: string
  createdAt: string
  template?: {
    id: string
    name: string
  }
  customer?: {
    id: string
    name: string
    email: string
  }
}

export default function EmailLogsPage() {
  const { data: session } = useSession()
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    total: 0,
    hasMore: false
  })

  const canViewLogs = session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_EMAIL_LOGS')

  const fetchEmailLogs = useCallback(async () => {
    try {
      const response = await fetch(`/api/emails/logs?limit=${pagination.limit}&offset=${pagination.offset}`)
      if (!response.ok) {
        throw new Error('Failed to fetch email logs')
      }
      const data = await response.json()
      setEmailLogs(data.emailLogs)
      setPagination(prev => ({
        ...prev,
        total: data.total,
        hasMore: data.hasMore
      }))
    } catch (error) {
      setError('メール送信履歴の取得に失敗しました')
      console.error('Error fetching email logs:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, pagination.offset])

  useEffect(() => {
    if (!canViewLogs) {
      setError('メール送信履歴を閲覧する権限がありません')
      setLoading(false)
      return
    }
    fetchEmailLogs()
  }, [canViewLogs, fetchEmailLogs])

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit)
      }))
    }
  }

  const handleNextPage = () => {
    if (pagination.hasMore) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit
      }))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SENT':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SENT':
        return '送信済み'
      case 'PENDING':
        return '送信中'
      case 'FAILED':
        return '送信失敗'
      default:
        return status
    }
  }

  if (!canViewLogs) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-600 mb-4">メール送信履歴を閲覧する権限がありません</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 mt-8">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">メール送信履歴</h1>
        <p className="mt-2 text-gray-600">
          送信されたメールの履歴を確認できます。
        </p>
      </div>

      {emailLogs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            メール送信履歴がありません
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {emailLogs.map((log) => (
                <li key={log.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {log.subject}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              宛先: {log.recipientName ? `${log.recipientName} (${log.recipientEmail})` : log.recipientEmail}
                            </div>
                            {log.template && (
                              <div className="text-sm text-gray-500 mt-1">
                                テンプレート: {log.template.name}
                              </div>
                            )}
                            <div className="text-sm text-gray-500 mt-1">
                              送信日時: {log.sentAt 
                                ? new Date(log.sentAt).toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : '未送信'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                          {getStatusText(log.status)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-md shadow">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                onClick={handlePrevPage}
                disabled={pagination.offset === 0}
                variant="outline"
                size="sm"
              >
                前へ
              </Button>
              <Button
                onClick={handleNextPage}
                disabled={!pagination.hasMore}
                variant="outline"
                size="sm"
              >
                次へ
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  全 <span className="font-medium">{pagination.total}</span> 件中{' '}
                  <span className="font-medium">{pagination.offset + 1}</span> -{' '}
                  <span className="font-medium">
                    {Math.min(pagination.offset + pagination.limit, pagination.total)}
                  </span>{' '}
                  件を表示
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    onClick={handlePrevPage}
                    disabled={pagination.offset === 0}
                    variant="outline"
                    size="sm"
                    className="rounded-r-none"
                  >
                    前へ
                  </Button>
                  <Button
                    onClick={handleNextPage}
                    disabled={!pagination.hasMore}
                    variant="outline"
                    size="sm"
                    className="rounded-l-none"
                  >
                    次へ
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}