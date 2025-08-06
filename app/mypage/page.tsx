'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useSystemSettings } from '@/hooks/use-system-settings'

interface Enrollment {
  id: string
  courseId: string
  enrolledAt: string
  status: string
  course: {
    id: string
    name: string
    description?: string
    price: number
  }
}

type SystemSettings = {
  systemName: string
  primaryColor?: string
  secondaryColor?: string
  logoUrl?: string
}

export default function MyPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMenu, setActiveMenu] = useState('account')
  
  // TanStack Query を使用
  const { data: systemSettings } = useSystemSettings()

  // 顧客のコース情報を取得
  const fetchEnrollments = useCallback(async () => {
    try {
      const response = await fetch('/api/customer-enrollments')
      if (response.ok) {
        const data = await response.json()
        setEnrollments(data.enrollments || [])
      }
    } catch (error) {
      console.error('Error fetching enrollments:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // システム設定はTanStack Queryで自動取得

  useEffect(() => {
    if (session === undefined) {
      // セッション読み込み中は何もしない
      return
    }
    
    if (session?.user?.userType === 'customer') {
      fetchEnrollments()
    } else if (session?.user?.userType === 'admin') {
      router.push('/dashboard')
    } else if (session === null) {
      // セッションが明示的にnullの場合のみログインページにリダイレクト
      router.push('/login')
    }
  }, [session, router, fetchEnrollments])

  // コースが付与されているかチェック
  const hasEnrollments = enrollments.length > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {systemSettings?.logoUrl ? (
                <div className="h-10 w-10 rounded-xl overflow-hidden mr-3 shadow-lg">
                  <Image
                    src={systemSettings.logoUrl}
                    alt={systemSettings?.systemName || 'CRMシステム'}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div 
                  className="h-10 w-10 rounded-xl flex items-center justify-center mr-3 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)' }}
                >
                  <span className="text-white font-bold text-lg">
                    {systemSettings?.systemName?.charAt(0) || 'M'}
                  </span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{systemSettings?.systemName || 'CRMシステム'}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                こんにちは、{session?.user?.name}さん
              </span>
              <Button 
                variant="outline" 
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Left Sidebar Menu */}
          <div className="w-64 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">メニュー</h2>
            <nav className="space-y-2">
              <Link 
                href="/mypage/profile"
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="mr-3">👤</span>
                アカウント
              </Link>
              <Link 
                href="/mypage/shop"
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="mr-3">🛍️</span>
                ショップ
              </Link>
              {hasEnrollments && (
                <Link 
                  href="/mypage/community"
                  className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="mr-3">🏘️</span>
                  コミュニティ
                </Link>
              )}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">ダッシュボード</h3>
              
              {/* Welcome Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-medium text-blue-900 mb-2">
                  ようこそ、{session?.user?.name}さん！
                </h4>
                <p className="text-blue-700">
                  こちらはあなたのマイページです。左のメニューから各機能をご利用ください。
                </p>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Link href="/mypage/profile">
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <h5 className="font-semibold text-gray-900 mb-2">アカウント設定</h5>
                    <p className="text-sm text-gray-600">プロフィール情報の確認・編集</p>
                  </div>
                </Link>
                <Link href="/mypage/shop">
                  <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <h5 className="font-semibold text-gray-900 mb-2">ショップ</h5>
                    <p className="text-sm text-gray-600">商品の閲覧・購入</p>
                  </div>
                </Link>
                {hasEnrollments && (
                  <Link href="/mypage/community">
                    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                      <h5 className="font-semibold text-gray-900 mb-2">コミュニティ</h5>
                      <p className="text-sm text-gray-600">受講中コースのコミュニティ</p>
                    </div>
                  </Link>
                )}
              </div>

              {/* Course Status */}
              {!hasEnrollments && (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">コースが見つかりません</h4>
                  <p className="text-gray-600">現在受講中のコースはありません。</p>
                  <Link href="/mypage/shop">
                    <Button className="mt-4">
                      ショップでコースを見る
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}