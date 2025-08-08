'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useCustomerProfile } from '@/hooks/use-customer-profile'

type Customer = {
  id: string
  name: string
  nameKana?: string
  email: string
  phone?: string
  address?: string
  birthDate?: string
  gender?: string
  joinedAt: string
}


export default function ProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // キャッシュされたデータを使用
  const { data: customer, isLoading: customerLoading, error: customerError } = useCustomerProfile()
  
  const [formData, setFormData] = useState({
    name: '',
    nameKana: '',
    email: '',
    phone: '',
    address: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // 顧客データが読み込まれたらフォームを更新
  useEffect(() => {
    if (customer) {
      setFormData(prev => ({
        ...prev,
        name: customer.name,
        nameKana: customer.nameKana || '',
        email: customer.email,
        phone: customer.phone || '',
        address: customer.address || ''
      }))
    }
  }, [customer])

  useEffect(() => {
    if (session === undefined) {
      // セッション読み込み中は何もしない
      return
    }
    
    if (session?.user?.userType === 'admin') {
      router.push('/dashboard')
    } else if (session === null) {
      // セッションが明示的にnullの場合のみログインページにリダイレクト
      router.push('/login')
    }
  }, [session, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError('')
    setSuccess('')

    // パスワード確認
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('新しいパスワードと確認用パスワードが一致しません')
      setUpdating(false)
      return
    }

    try {
      const updateData: any = {
        name: formData.name,
        nameKana: formData.nameKana,
        email: formData.email,
        phone: formData.phone,
        address: formData.address
      }

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword
        updateData.newPassword = formData.newPassword
      }

      const response = await fetch('/api/customer-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'プロフィールの更新に失敗しました')
      }

      setSuccess('プロフィールを更新しました')
      
      // パスワード関連フィールドをクリア
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (error) {
      console.error('Error updating profile:', error)
      setError(error instanceof Error ? error.message : 'プロフィールの更新に失敗しました')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatBirthDate = (dateString?: string) => {
    if (!dateString) return '未設定'
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (customerLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {customerError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            プロフィール情報の取得に失敗しました: {customerError.message}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">プロフィール情報</h2>
            {customer && (
              <p className="text-sm text-gray-600">
                登録日: {formatDate(customer.joinedAt)}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  お名前 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label htmlFor="nameKana" className="block text-sm font-medium text-gray-700 mb-2">
                  フリガナ
                </label>
                <input
                  type="text"
                  id="nameKana"
                  name="nameKana"
                  value={formData.nameKana}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="ヤマダタロウ"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                電話番号
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="090-1234-5678"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                住所
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="〒100-0001&#10;東京都千代田区千代田1-1&#10;千代田マンション101号室"
              />
            </div>

            {/* 読み取り専用フィールド */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生年月日
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                  {formatBirthDate(customer?.birthDate)}
                </div>
                <p className="text-xs text-gray-500 mt-1">生年月日は変更できません</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  性別
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                  {customer?.gender || '未設定'}
                </div>
                <p className="text-xs text-gray-500 mt-1">性別は変更できません</p>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-md font-medium text-gray-900 mb-4">パスワード変更</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    現在のパスワード
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      新しいパスワード
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="6文字以上"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      パスワード確認
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updating}
                className="px-6 py-2"
              >
                {updating ? '更新中...' : 'プロフィールを更新'}
              </Button>
            </div>
          </form>
        </div>
    </div>
  )
}