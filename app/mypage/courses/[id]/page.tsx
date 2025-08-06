'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface CourseDetails {
  id: string
  name: string
  description: string
  price: number
  duration: number
  isActive: boolean
  communityLinkText?: string
  communityLinkUrl?: string
  enrollment?: {
    id: string
    status: string
    enrolledAt: string
  }
}

interface SystemSettings {
  communityLinkText?: string
  communityLinkUrl?: string
}

export default function CourseDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [course, setCourse] = useState<CourseDetails | null>(null)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const courseId = params.id as string

  useEffect(() => {
    if (status === 'loading') return

    if (!session || session.user?.userType !== 'customer') {
      router.push('/login')
      return
    }

    fetchCourseData()
    fetchSystemSettings()
  }, [session, status, courseId, router])

  const fetchCourseData = async () => {
    try {
      console.log('🎓 Fetching course data for:', courseId)
      const response = await fetch(`/api/courses/${courseId}/customer-details`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('コースが見つかりません')
        } else if (response.status === 403) {
          throw new Error('このコースにアクセスする権限がありません')
        }
        throw new Error('コースデータの取得に失敗しました')
      }

      const data = await response.json()
      console.log('✅ Course data received:', data)
      setCourse(data)
    } catch (error) {
      console.error('❌ Error fetching course data:', error)
      setError(error instanceof Error ? error.message : 'エラーが発生しました')
    }
  }

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/system-settings')
      if (response.ok) {
        const settings = await response.json()
        setSystemSettings({
          communityLinkText: settings.communityLinkText,
          communityLinkUrl: settings.communityLinkUrl
        })
      }
    } catch (error) {
      console.error('System settings fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">コース情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">エラー</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.back()}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
              >
                戻る
              </button>
              <button
                onClick={() => router.push('/mypage')}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-50 transition-colors"
              >
                マイページに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
            <div className="text-gray-400 text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">コースが見つかりません</h2>
            <p className="text-gray-600 mb-6">指定されたコースは存在しないか、アクセス権限がありません。</p>
            <button
              onClick={() => router.push('/mypage')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              マイページに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  const formatDuration = (days: number) => {
    if (days >= 365) {
      const years = Math.floor(days / 365)
      return `${years}年`
    } else if (days >= 30) {
      const months = Math.floor(days / 30)
      return `${months}ヶ月`
    } else {
      return `${days}日`
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto py-8 px-4">
        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/mypage')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← マイページに戻る
          </button>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{course.name}</h1>
                <p className="text-gray-600 mb-4">{course.description}</p>
                
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <span className="mr-2">💰</span>
                    <span>¥{course.price.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-2">⏰</span>
                    <span>{formatDuration(course.duration)}</span>
                  </div>
                  {course.enrollment && (
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <span>登録日: {formatDate(course.enrollment.enrolledAt)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {course.enrollment && (
                <div className="ml-4">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    course.enrollment.status === 'ACTIVE' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {course.enrollment.status === 'ACTIVE' ? '受講中' : course.enrollment.status}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* コース専用コンテンツ */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                🎓 {course.name} - 専用コンテンツ
              </h2>
              
              {course.enrollment ? (
                <div className="space-y-6">
                  {/* 学習進捗 */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                      <span className="mr-2">📈</span>
                      学習進捗
                    </h3>
                    <div className="bg-gray-200 rounded-full h-3 mb-2">
                      <div className="bg-blue-600 h-3 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    <p className="text-sm text-gray-600">進捗率: 25%</p>
                  </div>

                  {/* 教材リンク */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                      <span className="mr-2">📚</span>
                      学習教材
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-blue-50 rounded hover:bg-blue-100 cursor-pointer transition-colors">
                        <div className="font-medium">第1章: 基礎知識</div>
                        <div className="text-sm text-gray-600">基本概念の理解</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors">
                        <div className="font-medium text-gray-500">第2章: 応用編</div>
                        <div className="text-sm text-gray-500">（第1章完了後に利用可能）</div>
                      </div>
                    </div>
                  </div>

                  {/* 課題・テスト */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                      <span className="mr-2">✏️</span>
                      課題・テスト
                    </h3>
                    <div className="space-y-2">
                      <div className="p-3 bg-yellow-50 rounded hover:bg-yellow-100 cursor-pointer transition-colors">
                        <div className="font-medium">課題1: 基礎理解度チェック</div>
                        <div className="text-sm text-orange-600">提出期限: 2025年9月30日</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-6xl mb-4">🔒</div>
                  <p className="text-gray-600">このコースにはまだ登録されていません。</p>
                  <p className="text-sm text-gray-500 mt-2">
                    ショップでコース受講権を購入すると、コンテンツにアクセスできます。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* コミュニティリンク（コース専用またはシステム設定） */}
            {(course.communityLinkUrl || systemSettings.communityLinkUrl) && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <span className="mr-2">💬</span>
                  {course.communityLinkUrl ? 'コース専用コミュニティ' : 'コミュニティ'}
                </h3>
                <a
                  href={course.communityLinkUrl || systemSettings.communityLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-600 text-white py-3 px-4 rounded text-center hover:bg-blue-700 transition-colors"
                >
                  {course.communityLinkText || systemSettings.communityLinkText || 'コミュニティに参加'}
                </a>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  ※外部サイトが開きます
                </p>
              </div>
            )}

            {/* 受講者情報 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">👤</span>
                受講者情報
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">受講者名:</span>
                  <span className="font-medium">{session?.user?.name}</span>
                </div>
                {course.enrollment && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">登録日:</span>
                      <span>{formatDate(course.enrollment.enrolledAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ステータス:</span>
                      <span className={course.enrollment.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'}>
                        {course.enrollment.status === 'ACTIVE' ? '受講中' : course.enrollment.status}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* その他のコース */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                <span className="mr-2">📖</span>
                その他のコース
              </h3>
              <p className="text-sm text-gray-600 mb-3">他のコースもチェック</p>
              <button
                onClick={() => router.push('/mypage/shop')}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-50 transition-colors text-sm"
              >
                ショップで確認
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}