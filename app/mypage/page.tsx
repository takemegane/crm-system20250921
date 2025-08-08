'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

export default function MyPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (session === undefined) {
      // セッション読み込み中は何もしない
      return
    }
    
    if (session?.user?.userType === 'customer') {
      fetchEnrollments()
    }
  }, [session, fetchEnrollments])

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">マイページ</h1>
        
        {/* Welcome Message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-medium text-blue-900 mb-2">
            ようこそ、{session?.user?.name}さん！
          </h2>
          <p className="text-blue-700">
            こちらはあなたのマイページです。下のメニューから各機能をご利用ください。
          </p>
        </div>

        {/* Quick Actions - 中央のリンクメニュー */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/mypage/profile">
            <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 hover:border-blue-300 transition-all cursor-pointer text-center">
              <div className="text-4xl mb-3">👤</div>
              <h3 className="font-semibold text-gray-900 mb-2">アカウント設定</h3>
              <p className="text-sm text-gray-600">プロフィール情報の確認・編集</p>
            </div>
          </Link>
          <Link href="/mypage/shop">
            <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 hover:border-blue-300 transition-all cursor-pointer text-center">
              <div className="text-4xl mb-3">🛍️</div>
              <h3 className="font-semibold text-gray-900 mb-2">ショップ</h3>
              <p className="text-sm text-gray-600">商品の閲覧・購入</p>
            </div>
          </Link>
          {hasEnrollments && (
            <Link href="/mypage/community">
              <div className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 hover:border-blue-300 transition-all cursor-pointer text-center">
                <div className="text-4xl mb-3">🏘️</div>
                <h3 className="font-semibold text-gray-900 mb-2">コミュニティ</h3>
                <p className="text-sm text-gray-600">受講中コースのコミュニティ</p>
              </div>
            </Link>
          )}
        </div>

        {/* Course Status */}
        {!hasEnrollments && (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">コースが見つかりません</h3>
            <p className="text-gray-600 mb-4">現在受講中のコースはありません。</p>
            <Link href="/mypage/shop">
              <Button>
                ショップでコースを見る
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}