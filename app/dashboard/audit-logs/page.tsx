'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'
import { getActionLabel, getEntityLabel } from '@/lib/audit'

type AuditLog = {
  id: string
  action: string
  entity?: string
  entityId?: string
  oldData?: string
  newData?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string
  customerName?: string | null
  user: {
    id: string
    email: string
    name?: string
    role: string
  }
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AuditLogsPage() {
  const { data: session } = useSession()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    entity: '',
    startDate: '',
    endDate: ''
  })

  const fetchAuditLogs = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      })

      const response = await fetch(`/api/audit-logs?${params}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('権限がありません')
          return
        }
        throw new Error('監査ログの取得に失敗しました')
      }

      const data = await response.json()
      setAuditLogs(data.auditLogs)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      setError(error instanceof Error ? error.message : '監査ログの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, filters])

  useEffect(() => {
    if (session?.user.role && hasPermission(session.user.role as UserRole, 'VIEW_AUDIT_LOGS')) {
      fetchAuditLogs()
    }
  }, [fetchAuditLogs, session?.user.role])

  // ADMIN and OWNER can access audit logs
  if (!session?.user.role || !hasPermission(session.user.role as UserRole, 'VIEW_AUDIT_LOGS')) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">権限がありません</h1>
        <p className="text-gray-600 mb-6">この機能を利用する権限がありません。</p>
        <Link href="/dashboard">
          <Button variant="outline">ダッシュボードに戻る</Button>
        </Link>
      </div>
    )
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'bg-green-100 text-green-800'
      case 'LOGOUT': return 'bg-gray-100 text-gray-800'
      case 'CREATE': return 'bg-blue-100 text-blue-800'
      case 'UPDATE': return 'bg-yellow-100 text-yellow-800'
      case 'DELETE': return 'bg-red-100 text-red-800'
      case 'SEND_EMAIL': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  const parseJsonSafely = (jsonString?: string) => {
    if (!jsonString) return null
    try {
      return JSON.parse(jsonString)
    } catch {
      return jsonString
    }
  }

  const getChangeDetails = (log: AuditLog) => {
    const details: { field: string; change: string }[] = []
    
    if (log.action === 'UPDATE' && log.entity === 'CUSTOMER') {
      const oldData = parseJsonSafely(log.oldData)
      const newData = parseJsonSafely(log.newData)
      
      if (oldData && newData) {
        // タグの変更
        if ('tags' in oldData && 'tags' in newData) {
          const oldTags = Array.isArray(oldData.tags) ? oldData.tags : []
          const newTags = Array.isArray(newData.tags) ? newData.tags : []
          if (JSON.stringify(oldTags) !== JSON.stringify(newTags)) {
            details.push({
              field: 'タグ',
              change: `${oldTags.join(', ') || 'なし'} → ${newTags.join(', ') || 'なし'}`
            })
          }
        }
        
        // コースの変更
        if ('courses' in oldData && 'courses' in newData) {
          const oldCourses = Array.isArray(oldData.courses) ? oldData.courses : []
          const newCourses = Array.isArray(newData.courses) ? newData.courses : []
          if (JSON.stringify(oldCourses) !== JSON.stringify(newCourses)) {
            details.push({
              field: 'コース',
              change: `${oldCourses.join(', ') || 'なし'} → ${newCourses.join(', ') || 'なし'}`
            })
          }
        }
        
        // 基本情報の変更
        const fieldMappings = {
          name: '氏名',
          nameKana: 'フリガナ',
          email: 'メールアドレス',
          phone: '電話番号',
          address: '住所',
          birthDate: '生年月日',
          gender: '性別',
          joinedAt: '入会日'
        }
        
        Object.entries(fieldMappings).forEach(([field, label]) => {
          if (field in oldData && field in newData && oldData[field] !== newData[field]) {
            details.push({
              field: label,
              change: `${oldData[field] || 'なし'} → ${newData[field] || 'なし'}`
            })
          }
        })
      }
    }
    
    return details.length > 0 ? details : null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">管理者操作履歴</h1>
        <p className="mt-2 text-gray-600">
          システムの操作履歴を確認できます（オーナーのみ）
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold mb-4">フィルター</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              アクション
            </label>
            <select
              value={filters.action}
              onChange={(e) => handleFilterChange('action', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">全て</option>
              <option value="LOGIN">ログイン</option>
              <option value="LOGOUT">ログアウト</option>
              <option value="CREATE">作成</option>
              <option value="UPDATE">更新</option>
              <option value="DELETE">削除</option>
              <option value="SEND_EMAIL">メール送信</option>
              <option value="ARCHIVE">アーカイブ</option>
              <option value="RESTORE">復元</option>
              <option value="STATUS_CHANGE">ステータス変更</option>
              <option value="CANCEL">キャンセル</option>
              <option value="SETTING_CHANGE">設定変更</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              対象エンティティ
            </label>
            <select
              value={filters.entity}
              onChange={(e) => handleFilterChange('entity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">全て</option>
              <option value="Customer">顧客</option>
              <option value="Course">コース</option>
              <option value="Tag">タグ</option>
              <option value="User">ユーザー</option>
              <option value="Email">メール</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              開始日
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              終了日
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => setFilters({
                action: '',
                userId: '',
                entity: '',
                startDate: '',
                endDate: ''
              })}
              variant="outline"
              className="w-full"
            >
              リセット
            </Button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="text-lg">読み込み中...</div>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            <p>{error}</p>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>該当する操作履歴が見つかりません</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ユーザー
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      アクション
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      対象
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      詳細
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {log.user.name || log.user.email}
                          </div>
                          <div className="text-gray-500">
                            {log.user.role}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                          {getActionLabel(log.action as any)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.entity && (
                          <div>
                            {log.entity === 'CUSTOMER' && log.customerName ? (
                              <div className="font-medium">{log.customerName}</div>
                            ) : (
                              <div className="font-medium">{getEntityLabel(log.entity)}</div>
                            )}
                            {log.entityId && (
                              <div className="text-gray-500 text-xs">{log.entityId}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        {(() => {
                          const details = getChangeDetails(log)
                          return details && (
                            <div className="space-y-1">
                              {details.map((detail, index) => (
                                <div key={index} className="text-xs">
                                  <span className="font-medium">{detail.field}:</span> {detail.change}
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 bg-gray-50">
                <div className="flex-1 flex justify-between sm:hidden">
                  <Button
                    onClick={() => fetchAuditLogs(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    variant="outline"
                    size="sm"
                  >
                    前へ
                  </Button>
                  <Button
                    onClick={() => fetchAuditLogs(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    variant="outline"
                    size="sm"
                  >
                    次へ
                  </Button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{pagination.total}</span>
                      件中{' '}
                      <span className="font-medium">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>
                      -{' '}
                      <span className="font-medium">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>
                      件を表示
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => fetchAuditLogs(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      variant="outline"
                      size="sm"
                    >
                      前へ
                    </Button>
                    <Button
                      onClick={() => fetchAuditLogs(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
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
    </div>
  )
}