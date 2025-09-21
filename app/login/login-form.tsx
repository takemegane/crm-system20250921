'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type SystemSettings = {
  systemName: string
  logoUrl?: string | null
  description?: string | null
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
}

interface LoginFormProps {
  settings: SystemSettings
}

export default function LoginForm({ settings }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')


    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      
      if (result?.error) {
        console.error('ログインエラー:', result.error)
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。')
        setLoading(false)
      } else if (result?.ok) {
        // ログイン成功後、セッション情報を取得してリダイレクト先を決定
        const session = await getSession()
        
        if (session?.user?.userType === 'customer') {
          // 顧客の場合はマイページへ（リダイレクトパラメータがあればそこへ）
          const redirectTo = redirectParam || '/mypage'
          router.push(redirectTo)
        } else {
          // 管理者の場合はダッシュボードへ
          router.push('/dashboard')
        }
      }
    } catch (error) {
      console.error('ログインエラー:', error)
      setError('ログイン中にエラーが発生しました。しばらくしてから再度お試しください。')
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundColor: settings.backgroundColor,
      }}
    >
      <div className="max-w-md w-full">
        <div className="bg-white shadow-2xl rounded-2xl p-8 space-y-8">
          <div className="text-center">
            {settings.logoUrl ? (
              <div className="flex justify-center mb-6">
                <img 
                  src={settings.logoUrl} 
                  alt={settings.systemName}
                  className="h-48 w-auto object-contain"
                />
              </div>
            ) : (
              <div 
                className="mx-auto h-48 w-48 rounded-full flex items-center justify-center mb-6"
                style={{ backgroundColor: `${settings.primaryColor}20` }}
              >
                <div 
                  className="text-6xl font-bold"
                  style={{ color: settings.primaryColor }}
                >
                  {settings.systemName.charAt(0)}
                </div>
              </div>
            )}
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {settings.systemName}
            </h2>
            <p className="text-gray-600">
              {settings.description || '管理者としてログインしてください'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition duration-200 text-sm"
                style={{
                  focusRingColor: `${settings.primaryColor}40`,
                  '--tw-ring-color': `${settings.primaryColor}40`,
                } as any}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition duration-200 text-sm"
                style={{
                  focusRingColor: `${settings.primaryColor}40`,
                  '--tw-ring-color': `${settings.primaryColor}40`,
                } as any}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-white font-medium rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              style={{
                backgroundColor: settings.primaryColor,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = settings.secondaryColor
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = settings.primaryColor
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  ログイン中...
                </div>
              ) : (
                'ログイン'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ECサイトをご利用ですか？{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                新規アカウント作成
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
