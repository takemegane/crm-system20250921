'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { ROLE_OPTIONS } from '@/lib/permissions'

type Admin = {
  id: string
  name: string | null
  email: string
  role: string
}

export default function EditAdminPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  
  // All hooks must be called before any conditional returns
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'ADMIN',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Only OWNER can edit admins
  const isOwner = session?.user?.role === 'OWNER'

  const fetchAdmin = useCallback(async () => {
    try {
      const response = await fetch(`/api/admins/${params.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch admin')
      }
      const admin: Admin = await response.json()
      setFormData({
        name: admin.name || '',
        email: admin.email,
        role: admin.role,
        password: '',
        confirmPassword: ''
      })
    } catch (error) {
      setError('管理者データの取得に失敗しました')
      console.error('Error fetching admin:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    if (isOwner) {
      fetchAdmin()
    }
  }, [isOwner, fetchAdmin])

  if (!isOwner) {
    return (
      <div className="text-center py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス拒否</h1>
        <p className="text-gray-600">管理者編集機能はオーナーのみアクセス可能です。</p>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    if (formData.password && formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setSaving(true)
    setError('')

    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      const response = await fetch(`/api/admins/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '管理者の更新に失敗しました')
      }

      router.push('/dashboard/admins')
    } catch (error) {
      setError(error instanceof Error ? error.message : '管理者の更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理者編集</h1>
        <p className="mt-2 text-gray-600">
          管理者情報を編集します。
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              名前
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              メールアドレス
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              権限
            </label>
            <select
              name="role"
              id="role"
              value={formData.role}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">パスワード変更</h3>
            <p className="text-sm text-gray-600 mb-4">パスワードを変更する場合のみ入力してください。</p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  新しいパスワード
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  新しいパスワード確認
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  minLength={6}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? '更新中...' : '管理者を更新'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}