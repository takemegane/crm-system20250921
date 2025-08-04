'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
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

type SystemSettings = {
  systemName: string
  primaryColor?: string
  secondaryColor?: string
  communityLinkText?: string
  communityLinkUrl?: string
}

export default function CommunityPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [loading, setLoading] = useState(true)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ systemName: 'コミュニティ' })

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

  // システム設定を取得
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await fetch('/api/system-settings')
        if (response.ok) {
          const settings = await response.json()
          setSystemSettings(settings)
        }
      } catch (error) {
        console.error('Error fetching system settings:', error)
      }
    }
    fetchSystemSettings()
  }, [])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  // コースが無い場合はマイページにリダイレクト
  if (enrollments.length === 0) {
    router.push('/mypage')
    return null
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/mypage" className="text-blue-600 hover:text-blue-800 mr-4">
                ← マイページ
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">コミュニティ</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                こんにちは、{session?.user?.name}さん
              </span>
              <Link href="/mypage/profile">
                <Button variant="outline">アカウント</Button>
              </Link>
              <Link href="/mypage/shop">
                <Button variant="outline">ショップ</Button>
              </Link>
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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">あなたのコース</h2>
          
          <div className="grid gap-6">
            {enrollments.map((enrollment) => (
              <div key={enrollment.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {enrollment.course.name}
                    </h3>
                    {enrollment.course.description && (
                      <p className="text-gray-600 mb-3">{enrollment.course.description}</p>
                    )}
                  </div>
                  <span className="inline-flex px-3 py-1 text-sm font-semibold bg-green-100 text-green-800 rounded-full">
                    受講中
                  </span>
                </div>

                {/* コミュニティリンク */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-3">コミュニティリンク</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-gray-900">コミュニティリンク</h5>
                        <p className="text-sm text-gray-600 mt-1">
                          受講生同士の交流や質問・相談ができるコミュニティスペースです
                        </p>
                      </div>
                      <div className="ml-4">
                        {systemSettings?.communityLinkText && systemSettings?.communityLinkUrl ? (
                          <a
                            href={systemSettings.communityLinkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            {systemSettings.communityLinkText}
                          </a>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
                          >
                            準備中
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      {systemSettings?.communityLinkText && systemSettings?.communityLinkUrl ? (
                        <p>💡 コミュニティページにアクセスできます。</p>
                      ) : (
                        <p>💡 コミュニティ機能は現在準備中です。近日中に公開予定です。</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ナビゲーション */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex space-x-4">
              <Link href="/mypage">
                <Button variant="outline">マイページに戻る</Button>
              </Link>
              <Link href="/mypage/profile">
                <Button variant="outline">アカウント設定</Button>
              </Link>
              <Link href="/mypage/shop">
                <Button variant="outline">ショップを見る</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}