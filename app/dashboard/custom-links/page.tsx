'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface CustomLink {
  id: string
  name: string
  url: string
  icon?: string
  sortOrder: number
  isActive: boolean
  isExternal: boolean
  openInNewTab: boolean
  createdAt: string
  updatedAt: string
}

interface FormData {
  name: string
  url: string
  sortOrder: number
}

export default function CustomLinksPage() {
  const { data: session } = useSession()
  const [customLinks, setCustomLinks] = useState<CustomLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    url: '',
    sortOrder: 0
  })

  // 権限チェック
  const canView = session?.user?.role && hasPermission(session.user.role as any, 'VIEW_CUSTOM_LINKS')
  const canManage = session?.user?.role && hasPermission(session.user.role as any, 'MANAGE_CUSTOM_LINKS')

  const fetchCustomLinks = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await fetch('/api/custom-links')
      if (!response.ok) {
        throw new Error('カスタムリンクの取得に失敗しました')
      }
      
      const result = await response.json()
      setCustomLinks(result.data || [])
    } catch (error) {
      console.error('Error fetching custom links:', error)
      setError(error instanceof Error ? error.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canView) {
      fetchCustomLinks()
    }
  }, [canView, fetchCustomLinks])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canManage) {
      setError('権限がありません')
      return
    }

    try {
      const url = editingId ? `/api/custom-links/${editingId}` : '/api/custom-links'
      const method = editingId ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'エラーが発生しました')
      }
      
      await fetchCustomLinks()
      resetForm()
      setError('')
    } catch (error) {
      console.error('Error saving custom link:', error)
      setError(error instanceof Error ? error.message : 'エラーが発生しました')
    }
  }

  const handleEdit = (link: CustomLink) => {
    setEditingId(link.id)
    setFormData({
      name: link.name,
      url: link.url,
      sortOrder: link.sortOrder
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!canManage) {
      setError('権限がありません')
      return
    }

    if (!confirm('このカスタムリンクを削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await fetch(`/api/custom-links/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'エラーが発生しました')
      }
      
      await fetchCustomLinks()
      setError('')
    } catch (error) {
      console.error('Error deleting custom link:', error)
      setError(error instanceof Error ? error.message : 'エラーが発生しました')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      sortOrder: 0
    })
    setEditingId(null)
    setShowForm(false)
  }

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限がありません</h2>
          <p className="text-gray-600">カスタムリンク管理へのアクセス権限がありません。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔗 カスタムリンク管理</h1>
          <p className="text-gray-600 mt-1">管理システムで使用するカスタムリンクを管理します。</p>
        </div>
        {canManage && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            + 新規追加
          </Button>
        )}
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* フォーム */}
      {showForm && canManage && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editingId ? 'カスタムリンク編集' : '新規カスタムリンク'}
            </h2>
            <Button variant="outline" size="sm" onClick={resetForm}>
              キャンセル
            </Button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                リンク名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 会社ホームページ"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                並び順
              </label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={resetForm}>
                キャンセル
              </Button>
              <Button type="submit">
                {editingId ? '更新' : '作成'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* カスタムリンク一覧 */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-500">読み込み中...</div>
          </div>
        ) : customLinks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-2">🔗</div>
            <p className="text-gray-500">カスタムリンクがありません</p>
            {canManage && (
              <Button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                最初のリンクを作成
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    リンク名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    並び順
                  </th>
                  {canManage && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customLinks.map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {link.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {link.sortOrder}
                    </td>
                    {canManage && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(link)}
                        >
                          編集
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(link.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          削除
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}