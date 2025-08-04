'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole, getRoleDisplayName } from '@/lib/permissions'

type Admin = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

export default function AdminsPage() {
  const { data: session } = useSession()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ADMIN and OWNER can access admin management
  const canViewAdmins = session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_ADMINS')
  const canCreateAdmins = session?.user?.role && hasPermission(session.user.role as UserRole, 'CREATE_ADMINS')
  const canEditAdmins = session?.user?.role && hasPermission(session.user.role as UserRole, 'EDIT_ADMINS')
  const canDeleteAdmins = session?.user?.role && hasPermission(session.user.role as UserRole, 'DELETE_ADMINS')

  const fetchAdmins = useCallback(async () => {
    try {
      const response = await fetch('/api/admins')
      if (!response.ok) {
        if (response.status === 401) {
          setError('権限がありません')
          return
        }
        throw new Error('Failed to fetch admins')
      }
      const data = await response.json()
      setAdmins(data)
    } catch (error) {
      setError('管理者データの取得に失敗しました')
      console.error('Error fetching admins:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteAdmin = async (id: string) => {
    if (!confirm('この管理者を削除しますか？')) {
      return
    }

    try {
      const response = await fetch(`/api/admins/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '管理者の削除に失敗しました')
      }

      fetchAdmins()
    } catch (error) {
      alert(error instanceof Error ? error.message : '管理者の削除に失敗しました')
    }
  }

  useEffect(() => {
    if (canViewAdmins) {
      fetchAdmins()
    }
  }, [canViewAdmins, fetchAdmins])

  if (!canViewAdmins) {
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
          <h1 className="text-3xl font-bold text-gray-900">管理者管理</h1>
          <p className="mt-2 text-gray-600">
            システム管理者の追加、編集、削除ができます。
          </p>
        </div>
        {canCreateAdmins && (
          <Link href="/dashboard/admins/new">
            <Button>
              新規管理者追加
            </Button>
          </Link>
        )}
      </div>

      {admins.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            管理者が登録されていません
          </div>
          <Link href="/dashboard/admins/new">
            <Button className="mt-4">
              最初の管理者を追加する
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {admins.map((admin) => (
              <li key={admin.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {admin.name ? admin.name.charAt(0) : admin.email.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {admin.name || 'No Name'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {admin.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            作成日: {new Date(admin.createdAt).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500 mr-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {getRoleDisplayName(admin.role as UserRole)}
                        </span>
                      </div>
                      {canEditAdmins && (
                        <Link href={`/dashboard/admins/${admin.id}/edit`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                          >
                            編集
                          </Button>
                        </Link>
                      )}
                      {canDeleteAdmins && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAdmin(admin.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          削除
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}