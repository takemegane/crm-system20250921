'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

type Course = {
  id: string
  name: string
  description?: string
  price: number
  duration?: string
  isActive: boolean
  createdAt: string
  communityLinkText?: string
  communityLinkUrl?: string
  enrollments: Array<{
    id: string
    customer: {
      name: string
    }
  }>
}

export default function CoursesPage() {
  const { data: session, status } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }
      const data = await response.json()
      setCourses(data.courses || data)
    } catch (error) {
      setError('コースデータの取得に失敗しました')
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteCourse = async (id: string) => {
    if (!confirm('このコースを削除しますか？')) {
      return
    }

    try {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'コースの削除に失敗しました')
      }

      fetchCourses()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'コースの削除に失敗しました')
    }
  }

  const handleDownloadCSV = async () => {
    try {
      setDownloading(true)
      const response = await fetch('/api/courses/export')
      
      if (!response.ok) {
        throw new Error('CSV download failed')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `courses_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error downloading CSV:', error)
      setError('CSVダウンロードに失敗しました')
    } finally {
      setDownloading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [])

  // セッション読み込み中の場合は読み込み状態を表示
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  // 未認証の場合はリダイレクト（middleware で処理されるはずだが念のため）
  if (!session) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">認証が必要です</div>
      </div>
    )
  }

  const canDeleteCourses = session?.user?.role && hasPermission(session.user.role as UserRole, 'DELETE_COURSES')

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
          <h1 className="text-3xl font-bold text-gray-900">コース管理</h1>
          <p className="mt-2 text-gray-600">
            コースの作成、編集、削除ができます。
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownloadCSV}
            disabled={downloading || courses.length === 0}
          >
            {downloading ? 'ダウンロード中...' : 'CSVダウンロード'}
          </Button>
          <Link href="/dashboard/courses/new">
            <Button>
              新規コース作成
            </Button>
          </Link>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            まだコースが登録されていません
          </div>
          <Link href="/dashboard/courses/new">
            <Button className="mt-4">
              最初のコースを作成する
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {courses.map((course) => (
              <li key={course.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {course.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {course.name}
                            </div>
                            {!course.isActive && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                無効
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {course.description || 'コース説明なし'}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            価格: ¥{course.price.toLocaleString()} 
                            {course.duration && ` | 期間: ${course.duration}`}
                            {course.communityLinkUrl && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                専用コミュニティあり
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500 mr-4">
                        受講者: {course.enrollments.length}人
                      </div>
                      <Link href={`/dashboard/courses/${course.id}/edit`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                        >
                          編集
                        </Button>
                      </Link>
                      {canDeleteCourses && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCourse(course.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          削除
                        </Button>
                      )}
                    </div>
                  </div>
                  {course.enrollments.length > 0 && (
                    <div className="mt-2 ml-14">
                      <div className="text-sm text-gray-600">
                        受講者: {course.enrollments.slice(0, 3).map(enrollment => enrollment.customer.name).join(', ')}
                        {course.enrollments.length > 3 && ` 他${course.enrollments.length - 3}人`}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}