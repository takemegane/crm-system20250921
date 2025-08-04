'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
  enrollments: Array<{
    id: string
    course: {
      id: string
      name: string
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

type Course = {
  id: string
  name: string
  price: number
}

type Tag = {
  id: string
  name: string
  color: string
}

export default function BulkEditCustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterCourse, setFilterCourse] = useState<string>('')
  const [filterTag, setFilterTag] = useState<string>('')
  const [operation, setOperation] = useState<'add' | 'replace' | 'remove'>('add')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 検索フィルターを適用した顧客リスト
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchQuery === '' || 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCourse = filterCourse === '' ||
      customer.enrollments.some(enrollment => enrollment.course.id === filterCourse)
    
    const matchesTag = filterTag === '' ||
      customer.customerTags.some(customerTag => customerTag.tag.id === filterTag)
    
    return matchesSearch && matchesCourse && matchesTag
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, coursesRes, tagsRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/courses'),
          fetch('/api/tags')
        ])
        
        if (customersRes.ok) {
          const customersData = await customersRes.json()
          const customers = customersData.customers || customersData
          setCustomers(customers)
        }
        
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json()
          const courses = coursesData.courses || coursesData
          setCourses(courses.filter((course: any) => course.isActive))
        }
        
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json()
          const tags = tagsData.tags || tagsData
          setTags(tags)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setError('データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const handleCustomerSelect = (customerId: string) => {
    if (selectedCustomers.includes(customerId)) {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId))
    } else {
      setSelectedCustomers([...selectedCustomers, customerId])
    }
  }

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedCustomers.length === 0) {
      setError('顧客を選択してください')
      return
    }

    if (selectedCourses.length === 0 && selectedTags.length === 0) {
      if (operation === 'remove') {
        setError('削除するコースまたはタグを選択してください')
      } else {
        setError('コースまたはタグを選択してください')
      }
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const promises = selectedCustomers.map(customerId => {
        const customer = customers.find(c => c.id === customerId)
        if (!customer) return Promise.resolve()

        let courseIds: string[] = []
        let tagIds: string[] = []

        if (operation === 'replace') {
          courseIds = selectedCourses
          tagIds = selectedTags
        } else if (operation === 'remove') {
          // 削除モード
          const existingCourseIds = customer.enrollments.map(e => e.course.id)
          const existingTagIds = customer.customerTags.map(ct => ct.tag.id)
          
          courseIds = existingCourseIds.filter(id => !selectedCourses.includes(id))
          tagIds = existingTagIds.filter(id => !selectedTags.includes(id))
        } else {
          // 追加モード
          const existingCourseIds = customer.enrollments.map(e => e.course.id)
          const existingTagIds = customer.customerTags.map(ct => ct.tag.id)
          
          courseIds = Array.from(new Set([...existingCourseIds, ...selectedCourses]))
          tagIds = Array.from(new Set([...existingTagIds, ...selectedTags]))
        }

        return fetch(`/api/customers/${customerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: customer.name,
            nameKana: customer.nameKana,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            birthDate: customer.birthDate,
            gender: customer.gender,
            joinedAt: customer.joinedAt.split('T')[0],
            courseIds,
            tagIds,
          }),
        })
      })

      await Promise.all(promises)
      router.push('/dashboard/customers')
      router.refresh()
    } catch (error) {
      console.error('Error updating customers:', error)
      setError('顧客の更新に失敗しました')
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">顧客一括編集</h1>
        <p className="mt-2 text-gray-600">
          複数の顧客にコースやタグを一括で設定できます。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* 顧客選択 */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          {/* 検索・フィルターエリア */}
          <div className="mb-4 space-y-4">
            {/* 検索バー */}
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
            
            {/* フィルターセレクト */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="filter-course" className="block text-sm font-medium text-gray-700 mb-1">
                  コースで絞り込み
                </label>
                <select
                  id="filter-course"
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">すべてのコース</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="filter-tag" className="block text-sm font-medium text-gray-700 mb-1">
                  タグで絞り込み
                </label>
                <select
                  id="filter-tag"
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">すべてのタグ</option>
                  {tags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">顧客選択</h2>
            <Button
              type="button"
              variant="outline"
              onClick={handleSelectAll}
            >
              {selectedCustomers.length === filteredCustomers.length ? '全解除' : '全選択'}
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedCustomers.includes(customer.id)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleCustomerSelect(customer.id)}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.includes(customer.id)}
                    onChange={() => handleCustomerSelect(customer.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mr-3"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            選択中: {selectedCustomers.length} / {filteredCustomers.length} 人
            {searchQuery && (
              <span className="ml-2 text-gray-500">
                (全{customers.length}人中{filteredCustomers.length}人を表示)
              </span>
            )}
          </div>
        </div>

        {/* 操作選択 */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">操作モード</h2>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="operation"
                value="add"
                checked={operation === 'add'}
                onChange={(e) => setOperation(e.target.value as 'add' | 'replace' | 'remove')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">追加モード（既存のコース・タグに追加）</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="operation"
                value="replace"
                checked={operation === 'replace'}
                onChange={(e) => setOperation(e.target.value as 'add' | 'replace' | 'remove')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">置換モード（既存のコース・タグを置き換え）</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="operation"
                value="remove"
                checked={operation === 'remove'}
                onChange={(e) => setOperation(e.target.value as 'add' | 'replace' | 'remove')}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">削除モード（選択したコース・タグを削除）</span>
            </label>
          </div>
        </div>

        {/* コース選択 */}
        {courses.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">コース設定</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`course-${course.id}`}
                    checked={selectedCourses.includes(course.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCourses([...selectedCourses, course.id])
                      } else {
                        setSelectedCourses(selectedCourses.filter(id => id !== course.id))
                      }
                    }}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`course-${course.id}`} className="ml-2 text-sm text-gray-900">
                    {course.name} (¥{course.price.toLocaleString()})
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* タグ選択 */}
        {tags.length > 0 && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">タグ設定</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  onClick={() => {
                    if (selectedTags.includes(tag.id)) {
                      setSelectedTags(selectedTags.filter(id => id !== tag.id))
                    } else {
                      setSelectedTags([...selectedTags, tag.id])
                    }
                  }}
                  className={`cursor-pointer px-3 py-1 rounded-full text-sm font-medium border-2 transition-colors ${
                    selectedTags.includes(tag.id)
                      ? 'border-primary-500 text-white'
                      : 'border-gray-300 text-gray-700 hover:border-primary-300'
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag.id) ? tag.color : 'transparent'
                  }}
                >
                  {tag.name}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <Button
            type="submit"
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? '更新中...' : `${selectedCustomers.length}人の顧客を一括${operation === 'remove' ? '削除' : '更新'}`}
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
  )
}