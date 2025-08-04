'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

type Customer = {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  joinedAt: string
  enrollments: Array<{
    id: string
    course: {
      name: string
    }
    enrolledAt: string
    status: string
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
}

export default function CustomersPage() {
  const { data: session, status } = useSession()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  const [selectedTagId, setSelectedTagId] = useState<string>('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const fetchCustomers = async (tagId?: string, courseId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (tagId) params.append('tagId', tagId)
      if (courseId) params.append('courseId', courseId)
      const url = `/api/customers${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }
      const data = await response.json()
      console.log('Customers API response:', data)
      setCustomers(data.customers || data)
    } catch (error) {
      setError('顧客データの取得に失敗しました')
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setAllTags(data.tags || data)
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses')
      if (response.ok) {
        const data = await response.json()
        setAllCourses(data.courses || data)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  useEffect(() => {
    fetchCustomers()
    fetchTags()
    fetchCourses()
  }, [])

  useEffect(() => {
    fetchCustomers(selectedTagId || undefined, selectedCourseId || undefined)
  }, [selectedTagId, selectedCourseId])

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

  const handleDownloadCSV = async () => {
    try {
      setDownloading(true)
      const params = new URLSearchParams()
      if (selectedTagId) params.append('tagId', selectedTagId)
      if (selectedCourseId) params.append('courseId', selectedCourseId)
      const url = `/api/customers/export${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('CSV download failed')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`
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

  // 検索とタグフィルターを適用した顧客リスト
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === '' || 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesSearch
  })

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
          <h1 className="text-3xl font-bold text-gray-900">顧客管理</h1>
          <p className="mt-2 text-gray-600">
            登録済みの顧客一覧を確認できます。
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownloadCSV}
            disabled={downloading || customers.length === 0}
          >
            {downloading ? 'ダウンロード中...' : 'CSVダウンロード'}
          </Button>
          <Link href="/dashboard/customers/upload">
            <Button variant="outline">
              CSV一括登録
            </Button>
          </Link>
          <Link href="/dashboard/customers/bulk">
            <Button variant="outline">
              一括編集
            </Button>
          </Link>
          <Link href="/dashboard/customers/new">
            <Button>
              新規顧客登録
            </Button>
          </Link>
        </div>
      </div>

      {/* 検索バー */}
      <div className="mb-6">
        <div className="max-w-md">
          <label htmlFor="customer-search" className="sr-only">
            顧客を検索
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="customer-search"
              type="text"
              placeholder="顧客名またはメールアドレスで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="mb-6 space-y-4">
        {/* タグフィルター */}
        {allTags.length > 0 && (
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700">タグで絞り込み:</span>
              <button
                onClick={() => setSelectedTagId('')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedTagId === ''
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                すべて
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setSelectedTagId(tag.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedTagId === tag.id
                      ? 'text-white border-2 border-opacity-50'
                      : 'text-gray-700 hover:opacity-80 border border-gray-300'
                  }`}
                  style={{
                    backgroundColor: selectedTagId === tag.id ? tag.color : 'transparent',
                    borderColor: selectedTagId === tag.id ? tag.color : undefined
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* コースフィルター */}
        {allCourses.length > 0 && (
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-700">コースで絞り込み:</span>
              <button
                onClick={() => setSelectedCourseId('')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCourseId === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                すべて
              </button>
              {allCourses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCourseId === course.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {course.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            {customers.length === 0 ? 'まだ顧客が登録されていません' : '該当する顧客が見つかりませんでした'}
          </div>
          {customers.length === 0 && (
            <Link href="/dashboard/customers/new">
              <Button className="mt-4">
                最初の顧客を登録する
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredCustomers.map((customer) => (
              <li key={customer.id}>
                <Link 
                  href={`/dashboard/customers/${customer.id}`}
                  className="block hover:bg-gray-50 px-4 py-4 sm:px-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {customer.name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {customer.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {customer.email}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="text-sm text-gray-500">
                        入会日: {new Date(customer.joinedAt).toLocaleDateString('ja-JP')}
                      </div>
                      <div className="text-sm text-gray-500">
                        申込コース: {customer.enrollments.length}件
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 ml-14 space-y-2">
                    {/* コース */}
                    {customer.enrollments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {customer.enrollments.slice(0, 3).map((enrollment) => (
                          <span
                            key={enrollment.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                          >
                            {enrollment.course.name}
                          </span>
                        ))}
                        {customer.enrollments.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{customer.enrollments.length - 3}件
                          </span>
                        )}
                      </div>
                    )}
                    {/* タグ */}
                    {customer.customerTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {customer.customerTags.slice(0, 5).map((customerTag) => (
                          <span
                            key={customerTag.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: customerTag.tag.color }}
                          >
                            {customerTag.tag.name}
                          </span>
                        ))}
                        {customer.customerTags.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{customer.customerTags.length - 5}件
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}