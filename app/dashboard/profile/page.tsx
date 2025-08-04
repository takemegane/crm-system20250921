'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

type User = {
  id: string
  name: string
  email: string
  role: string
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canEditProfile = session?.user?.role && hasPermission(session.user.role as UserRole, 'EDIT_PROFILE')

  useEffect(() => {
    if (!canEditProfile) {
      router.push('/dashboard')
      return
    }

    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
          setName(userData.name || '')
          setEmail(userData.email || '')
        } else {
          setError('ユーザー情報の取得に失敗しました')
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        setError('ユーザー情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchUserData()
    }
  }, [session, canEditProfile, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!name.trim() || !email.trim()) {
      setError('名前とメールアドレスは必須です')
      return
    }

    if (newPassword && newPassword !== confirmPassword) {
      setError('新しいパスワードと確認用パスワードが一致しません')
      return
    }

    if (newPassword && newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください')
      return
    }

    setSubmitting(true)

    try {
      const requestBody: any = {
        name: name.trim(),
        email: email.trim(),
      }

      if (newPassword) {
        if (!currentPassword) {
          setError('パスワードを変更する場合は現在のパスワードが必要です')
          setSubmitting(false)
          return
        }
        requestBody.currentPassword = currentPassword
        requestBody.newPassword = newPassword
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('プロフィールが正常に更新されました')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        
        // セッションを更新
        await update({
          ...session,
          user: {
            ...session?.user,
            name: name.trim(),
            email: email.trim(),
          }
        })
      } else {
        setError(data.error || 'プロフィールの更新に失敗しました')
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setError('プロフィールの更新に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (!canEditProfile) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-600 mb-4">この機能にアクセスする権限がありません</p>
        <Button onClick={() => router.push('/dashboard')}>
          ダッシュボードに戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">プロフィール編集</h1>
        <p className="mt-2 text-gray-600">
          ユーザー情報とパスワードを変更できます。
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              名前 *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              メールアドレス *
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              権限
            </label>
            <input
              type="text"
              id="role"
              value={user?.role === 'OPERATOR' ? '運営者' : user?.role === 'ADMIN' ? '管理者' : 'オーナー権限'}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
              disabled
            />
            <p className="mt-1 text-sm text-gray-500">
              権限は変更できません
            </p>
          </div>

          <hr className="my-6" />

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">パスワード変更</h3>
            <p className="text-sm text-gray-600">
              パスワードを変更する場合のみ以下のフィールドを入力してください。
            </p>

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                現在のパスワード
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                新しいパスワード
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                minLength={6}
              />
              <p className="mt-1 text-sm text-gray-500">
                6文字以上で入力してください
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                新しいパスワード（確認）
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                minLength={6}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? '更新中...' : 'プロフィールを更新'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              キャンセル
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}