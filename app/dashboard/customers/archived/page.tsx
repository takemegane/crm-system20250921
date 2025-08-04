'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { hasPermission, UserRole } from '@/lib/permissions'

type ArchivedCustomer = {
  id: string
  name: string
  email: string
  phone: string | null
  address: string | null
  joinedAt: string
  archivedAt: string | null
  enrollments: Array<{
    id: string
    enrolledAt: string
    status: string
    course: {
      id: string
      name: string
      price: number
    }
  }>
}

type PaginationInfo = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ArchivedCustomersPage() {
  const { data: session } = useSession()
  const [customers, setCustomers] = useState<ArchivedCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })

  // Only ADMIN and OWNER can view and restore archived customers
  const canRestoreCustomers = session?.user?.role && hasPermission(session.user.role as UserRole, 'RESTORE_CUSTOMERS')

  const fetchArchivedCustomers = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      })
      
      if (search) {
        params.append('search', search)
      }

      const response = await fetch(`/api/customers/archived?${params}`)
      if (!response.ok) {
        if (response.status === 401) {
          setError('権限がありません')
          return
        }
        throw new Error('Failed to fetch archived customers')
      }
      
      const data = await response.json()
      setCustomers(data.customers)
      setPagination(data.pagination)
    } catch (error) {
      setError('アーカイブした顧客データの取得に失敗しました')
      console.error('Error fetching archived customers:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.limit])

  const restoreCustomer = async (id: string, name: string) => {
    if (!confirm(`${name}さんを復元しますか？復元した顧客は通常の顧客一覧に表示されます。`)) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${id}/unarchive`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '顧客の復元に失敗しました')
      }

      fetchArchivedCustomers(pagination.page, searchTerm)
    } catch (error) {
      alert(error instanceof Error ? error.message : '顧客の復元に失敗しました')
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    fetchArchivedCustomers(1, searchTerm)
  }

  const handlePageChange = (newPage: number) => {
    fetchArchivedCustomers(newPage, searchTerm)
  }

  useEffect(() => {
    if (canRestoreCustomers) {
      fetchArchivedCustomers()
    }
  }, [canRestoreCustomers, fetchArchivedCustomers])

  if (!canRestoreCustomers) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">権限がありません</h1>
        <p className="text-gray-600 mb-6">この機能を利用する権限がありません。</p>
        <Link href="/dashboard/customers">
          <Button variant="outline">顧客一覧に戻る</Button>
        </Link>
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">アーカイブ済み顧客</h1>
          <p className="mt-2 text-gray-600">
            アーカイブされた顧客の一覧です。復元すると通常の顧客一覧に戻ります。
          </p>
        </div>
        <Link href="/dashboard/customers">
          <Button variant="outline">
            通常の顧客一覧へ
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <Input
            type="text"
            placeholder="顧客名、メールアドレス、電話番号で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">検索</Button>
        </form>
      </div>

      {customers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {searchTerm ? '検索条件に一致するアーカイブ済み顧客はいません' : 'アーカイブ済み顧客はいません'}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <li key={customer.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                {customer.name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {customer.email}
                            </div>
                            {customer.phone && (
                              <div className="text-sm text-gray-500">
                                {customer.phone}
                              </div>
                            )}
                            <div className="text-sm text-gray-500">
                              入会日: {new Date(customer.joinedAt).toLocaleDateString('ja-JP')}
                            </div>
                            {customer.archivedAt && (
                              <div className="text-sm text-red-500">
                                アーカイブ日: {new Date(customer.archivedAt).toLocaleDateString('ja-JP')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-500 mr-4">
                          申込コース数: {customer.enrollments.length}
                        </div>
                        <Link href={`/dashboard/customers/${customer.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                          >
                            詳細
                          </Button>
                        </Link>
                        {canRestoreCustomers && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => restoreCustomer(customer.id, customer.name)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50"
                          >
                            復元
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <nav className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  前へ
                </Button>
                
                <span className="text-sm text-gray-700">
                  {pagination.page} / {pagination.totalPages} ページ 
                  （全 {pagination.total} 件）
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  次へ
                </Button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  )
}