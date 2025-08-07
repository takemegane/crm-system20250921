'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'
import { formatAge, formatGender } from '@/lib/age-utils'
import { useArchiveCustomer, useUnarchiveCustomer, useDeleteCustomer } from '@/hooks/use-customers'

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
  isArchived: boolean
  archivedAt?: string | null
  enrollments: Array<{
    id: string
    enrolledAt: string
    status: string
    course: {
      id: string
      name: string
      description?: string
      price: number
    }
  }>
  customerTags: Array<{
    id: string
    tag: {
      id: string
      name: string
      color: string
    }
  }>
}

type Tag = {
  id: string
  name: string
  color: string
}

type Course = {
  id: string
  name: string
  price: number
  isActive: boolean
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canSendEmail = session?.user?.role && hasPermission(session.user.role as UserRole, 'SEND_INDIVIDUAL_EMAIL')
  const canEditCustomers = session?.user?.role && hasPermission(session.user.role as UserRole, 'EDIT_CUSTOMERS')
  const canDeleteCustomers = session?.user?.role && hasPermission(session.user.role as UserRole, 'DELETE_CUSTOMERS')
  const canArchiveCustomers = session?.user?.role && hasPermission(session.user.role as UserRole, 'ARCHIVE_CUSTOMERS')
  const canRestoreCustomers = session?.user?.role && hasPermission(session.user.role as UserRole, 'RESTORE_CUSTOMERS')
  const canChangePassword = session?.user?.role && hasPermission(session.user.role as UserRole, 'CHANGE_CUSTOMER_PASSWORD')

  const addTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/customers/${params.id}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagId }),
      })

      if (response.ok) {
        // Refresh customer data
        const customerRes = await fetch(`/api/customers/${params.id}`)
        if (customerRes.ok) {
          const customerData = await customerRes.json()
          setCustomer(customerData)
        }
      }
    } catch (error) {
      console.error('Error adding tag:', error)
    }
  }

  const removeTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/customers/${params.id}/tags/${tagId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh customer data
        const customerRes = await fetch(`/api/customers/${params.id}`)
        if (customerRes.ok) {
          const customerData = await customerRes.json()
          setCustomer(customerData)
        }
      }
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  const addCourse = async (courseId: string) => {
    try {
      const response = await fetch(`/api/customers/${params.id}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId }),
      })

      if (response.ok) {
        // Refresh customer data
        const customerRes = await fetch(`/api/customers/${params.id}`)
        if (customerRes.ok) {
          const customerData = await customerRes.json()
          setCustomer(customerData)
        }
      }
    } catch (error) {
      console.error('Error adding course:', error)
    }
  }

  const removeCourse = async (enrollmentId: string) => {
    try {
      const response = await fetch(`/api/customers/${params.id}/courses/${enrollmentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh customer data
        const customerRes = await fetch(`/api/customers/${params.id}`)
        if (customerRes.ok) {
          const customerData = await customerRes.json()
          setCustomer(customerData)
        }
      }
    } catch (error) {
      console.error('Error removing course:', error)
    }
  }

  const archiveCustomer = useArchiveCustomer()
  
  const handleArchiveCustomer = async () => {
    if (!confirm('この顧客をアーカイブしますか？アーカイブした顧客は一覧から非表示になります。')) {
      return
    }

    try {
      await archiveCustomer.mutateAsync(params.id as string)
      setError('')
      alert('顧客を正常にアーカイブしました')
      router.push('/dashboard/customers')
    } catch (error) {
      console.error('Error archiving customer:', error)
      setError('顧客のアーカイブに失敗しました')
    }
  }

  const unarchiveCustomer = useUnarchiveCustomer()
  
  const handleRestoreCustomer = async () => {
    if (!confirm('この顧客を復元しますか？復元した顧客は通常の顧客一覧に表示されます。')) {
      return
    }

    try {
      const restoredCustomer = await unarchiveCustomer.mutateAsync(params.id as string)
      setError('')
      if (customer && restoredCustomer) {
        setCustomer({
          ...customer,
          ...(restoredCustomer as any),
          enrollments: customer.enrollments,
          customerTags: customer.customerTags
        })
      }
      alert('顧客を正常に復元しました')
      router.push('/dashboard/customers')
    } catch (error) {
      console.error('Error restoring customer:', error)
      setError('顧客の復元に失敗しました')
    }
  }

  const deleteCustomer = useDeleteCustomer()
  
  const handleDeleteCustomer = async () => {
    if (!confirm('この顧客を完全に削除しますか？この操作は取り消せません。')) {
      return
    }

    try {
      await deleteCustomer.mutateAsync(params.id as string)
      setError('')
      alert('顧客を正常に削除しました')
      router.push('/dashboard/customers')
    } catch (error) {
      console.error('Error deleting customer:', error)
      setError('顧客の削除に失敗しました')
    }
  }

  const handleChangePassword = async () => {
    const newPassword = prompt('新しいパスワードを入力してください（6文字以上）:')
    
    if (!newPassword) {
      return
    }
    
    if (newPassword.length < 6) {
      alert('パスワードは6文字以上で入力してください')
      return
    }

    if (!confirm(`${customer?.name}さんのパスワードを変更しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${params.id}/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newPassword }),
      })

      if (response.ok) {
        alert('パスワードが正常に変更されました')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'パスワードの変更に失敗しました')
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setError('パスワードの変更に失敗しました')
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customerRes, tagsRes, coursesRes] = await Promise.all([
          fetch(`/api/customers/${params.id}`),
          fetch('/api/tags'),
          fetch('/api/courses')
        ])
        
        if (!customerRes.ok) {
          if (customerRes.status === 404) {
            setError('顧客が見つかりません')
          } else {
            throw new Error('Failed to fetch customer')
          }
          return
        }
        const customerData = await customerRes.json()
        setCustomer(customerData)
        
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json()
          setAllTags(tagsData.tags || tagsData)
        }
        
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json()
          const courses = coursesData.courses || coursesData
          setAllCourses(courses.filter((course: Course) => course.isActive))
        }
      } catch (error) {
        setError('データの取得に失敗しました')
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchData()
    }
  }, [params.id])

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-600 mb-4">{error}</p>
        <div className="space-x-4">
          <Link href="/dashboard/customers">
            <Button variant="outline">顧客一覧に戻る</Button>
          </Link>
          {canRestoreCustomers && (
            <Link href="/dashboard/customers/archived">
              <Button variant="outline">アーカイブ済み顧客一覧に戻る</Button>
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex space-x-4 text-sm">
              <Link href="/dashboard/customers" className="text-primary-600 hover:text-primary-700">
                ← 顧客一覧に戻る
              </Link>
              {canRestoreCustomers && (
                <Link href="/dashboard/customers/archived" className="text-primary-600 hover:text-primary-700">
                  ← アーカイブ済み顧客一覧に戻る
                </Link>
              )}
            </div>
            <div className="flex items-center mt-2">
              <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
              {customer.isArchived && (
                <span className="ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  アーカイブ済み
                </span>
              )}
            </div>
            <p className="text-gray-600">{customer.email}</p>
            {customer.isArchived && customer.archivedAt && (
              <p className="text-sm text-red-500 mt-1">
                アーカイブ日: {new Date(customer.archivedAt).toLocaleDateString('ja-JP')}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            {canSendEmail && !customer.isArchived && (
              <Link href={`/dashboard/customers/${customer.id}/send-email`}>
                <Button variant="outline">
                  メールを送信
                </Button>
              </Link>
            )}
            {canEditCustomers && !customer.isArchived && (
              <Link href={`/dashboard/customers/${customer.id}/edit`}>
                <Button>
                  編集
                </Button>
              </Link>
            )}
            {canChangePassword && !customer.isArchived && (
              <Button 
                variant="outline"
                onClick={handleChangePassword}
                className="text-orange-600 hover:text-orange-700 border-orange-600 hover:border-orange-700"
              >
                パスワード変更
              </Button>
            )}
            {canRestoreCustomers && customer.isArchived && (
              <Button 
                variant="outline"
                onClick={handleRestoreCustomer}
                className="text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
              >
                復元
              </Button>
            )}
            {canArchiveCustomers && !customer.isArchived && (
              <Button 
                variant="outline"
                onClick={handleArchiveCustomer}
                className="text-orange-600 hover:text-orange-700 border-orange-600 hover:border-orange-700"
              >
                アーカイブ
              </Button>
            )}
            {canDeleteCustomers && (
              <Button 
                variant="outline"
                onClick={handleDeleteCustomer}
                className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700"
              >
                削除
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">基本情報</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">氏名</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.name}</dd>
              </div>
              {customer.nameKana && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">フリガナ</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.nameKana}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.email}</dd>
              </div>
              {customer.birthDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">生年月日・年齢</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(customer.birthDate).toLocaleDateString('ja-JP')} 
                    <span className="ml-2 text-primary-600 font-medium">
                      ({formatAge(customer.birthDate)})
                    </span>
                  </dd>
                </div>
              )}
              {customer.gender && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">性別</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatGender(customer.gender)}</dd>
                </div>
              )}
              {customer.phone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">電話番号</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.phone}</dd>
                </div>
              )}
              {customer.address && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">住所</dt>
                  <dd className="mt-1 text-sm text-gray-900">{customer.address}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">入会日</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(customer.joinedAt).toLocaleDateString('ja-JP')}
                </dd>
              </div>
              {customer.customerTags.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">タグ</dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      {customer.customerTags.map((customerTag) => (
                        <span
                          key={customerTag.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: customerTag.tag.color }}
                        >
                          {customerTag.tag.name}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          {/* コース管理セクション - 上部に移動して強調 */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {canEditCustomers && !customer.isArchived ? 'コース管理' : '受講コース'}
              </h2>
            </div>
            <div className="px-6 py-4">
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  現在の受講コース
                </h3>
                {customer.enrollments.length === 0 ? (
                  <p className="text-gray-500 text-sm">受講中のコースはありません</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {customer.enrollments.map((enrollment) => (
                      <span
                        key={enrollment.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-green-600"
                      >
                        {enrollment.course.name}
                        {canEditCustomers && !customer.isArchived && (
                          <button
                            onClick={() => removeCourse(enrollment.id)}
                            className="ml-1 text-white hover:text-gray-200"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {canEditCustomers && !customer.isArchived && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">コースを追加</h3>
                  
                  <div className="flex flex-wrap gap-2">
                    {allCourses
                      .filter(course => !customer.enrollments.some(e => e.course.id === course.id))
                      .map((course) => (
                        <button
                          key={course.id}
                          onClick={() => addCourse(course.id)}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80 border-blue-600 text-blue-600"
                        >
                          + {course.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* タグ管理セクション */}
          {canEditCustomers && !customer.isArchived && (
            <div className="bg-white shadow rounded-lg mt-6">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">タグ管理</h2>
              </div>
              <div className="px-6 py-4">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">現在のタグ</h3>
                  {customer.customerTags.length === 0 ? (
                    <p className="text-gray-500 text-sm">タグが設定されていません</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {customer.customerTags.map((customerTag) => (
                        <span
                          key={customerTag.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: customerTag.tag.color }}
                        >
                          {customerTag.tag.name}
                          <button
                            onClick={() => removeTag(customerTag.tag.id)}
                            className="ml-1 text-white hover:text-gray-200"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">タグを追加</h3>
                  <div className="flex flex-wrap gap-2">
                    {allTags
                      .filter(tag => !customer.customerTags.some(ct => ct.tag.id === tag.id))
                      .map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => addTag(tag.id)}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors hover:opacity-80"
                          style={{ 
                            borderColor: tag.color,
                            color: tag.color
                          }}
                        >
                          + {tag.name}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}