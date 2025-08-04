'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

type Customer = {
  id: string
  name: string
  email: string
}

type EmailTemplate = {
  id: string
  name: string
  subject: string
  content: string
  isDefault: boolean
  isActive: boolean
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

export default function BulkEmailPage() {
  const { data: session } = useSession()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [formData, setFormData] = useState({
    templateId: '',
    subject: '',
    content: '',
    includeAll: false,
    selectedTagIds: [] as string[],
    selectedCourseIds: [] as string[],
    selectedCustomerIds: [] as string[]
  })
  const [previewCustomers, setPreviewCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const canSendBulkEmail = session?.user?.role && hasPermission(session.user.role as UserRole, 'SEND_BULK_EMAIL')

  const updatePreview = useCallback(async () => {
    try {
      const response = await fetch('/api/emails/preview-recipients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeAll: formData.includeAll,
          selectedTagIds: formData.selectedTagIds,
          selectedCourseIds: formData.selectedCourseIds,
          selectedCustomerIds: formData.selectedCustomerIds
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setPreviewCustomers(data.customers || [])
      }
    } catch (error) {
      console.error('Error updating preview:', error)
    }
  }, [formData.includeAll, formData.selectedTagIds, formData.selectedCourseIds, formData.selectedCustomerIds])

  useEffect(() => {
    if (!canSendBulkEmail) {
      setError('一括メール送信の権限がありません')
      setLoading(false)
      return
    }
    fetchData()
  }, [canSendBulkEmail])

  useEffect(() => {
    if (!loading) {
      updatePreview()
    }
  }, [updatePreview, loading])

  const fetchData = async () => {
    try {
      // Fetch customers
      const customersResponse = await fetch('/api/customers')
      if (customersResponse.ok) {
        const customersData = await customersResponse.json()
        console.log('Customers data received:', customersData)
        setCustomers(customersData.customers || [])
      } else {
        console.error('Failed to fetch customers:', customersResponse.status)
      }

      // Fetch email templates
      const templatesResponse = await fetch('/api/email-templates')
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setTemplates(templatesData.filter((template: EmailTemplate) => template.isActive))
      }

      // Fetch tags
      const tagsResponse = await fetch('/api/tags')
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json()
        setTags(tagsData.tags || [])
      }

      // Fetch courses
      const coursesResponse = await fetch('/api/courses')
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json()
        const courses = coursesData.courses || coursesData
        setCourses(courses.filter((course: Course) => course.isActive))
      }
    } catch (error) {
      setError('データの取得に失敗しました')
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setFormData(prev => ({
        ...prev,
        templateId,
        subject: template.subject,
        content: template.content
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        templateId: '',
        subject: '',
        content: ''
      }))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name === 'templateId') {
      handleTemplateChange(value)
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleCustomerSelection = (customerId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedCustomerIds: checked
        ? [...prev.selectedCustomerIds, customerId]
        : prev.selectedCustomerIds.filter(id => id !== customerId)
    }))
  }

  const handleTagSelection = (tagId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedTagIds: checked
        ? [...prev.selectedTagIds, tagId]
        : prev.selectedTagIds.filter(id => id !== tagId)
    }))
  }

  const handleCourseSelection = (courseId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      selectedCourseIds: checked
        ? [...prev.selectedCourseIds, courseId]
        : prev.selectedCourseIds.filter(id => id !== courseId)
    }))
  }

  const getRecipientCount = () => {
    return previewCustomers.length
  }

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject || !formData.content) {
      setError('件名と本文を入力してください')
      return
    }

    // 送信先バリデーション
    if (!formData.includeAll && 
        formData.selectedTagIds.length === 0 && 
        formData.selectedCourseIds.length === 0 && 
        formData.selectedCustomerIds.length === 0) {
      setError('送信先を選択してください')
      return
    }
    
    if (previewCustomers.length === 0) {
      setError('送信対象の顧客が見つかりません')
      return
    }

    setError('')
    setShowPreview(true)
  }

  const handleSend = async () => {
    setSending(true)
    setError('')

    try {
      const response = await fetch('/api/emails/bulk-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: formData.templateId || null,
          subject: formData.subject,
          content: formData.content,
          includeAll: formData.includeAll,
          selectedTagIds: formData.selectedTagIds,
          selectedCourseIds: formData.selectedCourseIds,
          selectedCustomerIds: formData.selectedCustomerIds
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '一括メール送信に失敗しました')
      }

      const result = await response.json()
      alert(`${result.sentCount}件のメールを送信しました`)
      
      // Reset form
      setFormData({
        templateId: '',
        subject: '',
        content: '',
        includeAll: false,
        selectedTagIds: [],
        selectedCourseIds: [],
        selectedCustomerIds: []
      })
      setShowPreview(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : '一括メール送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  if (!canSendBulkEmail) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-600 mb-4">一括メール送信の権限がありません</p>
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">一括メール配信</h1>
        <p className="mt-2 text-gray-600">
          複数の顧客に一括でメールを送信します。
        </p>
      </div>

      {!showPreview ? (
        <div className="bg-white shadow sm:rounded-lg">
          <form onSubmit={handlePreview} className="space-y-6 p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

          <div>
            <label htmlFor="templateId" className="block text-sm font-medium text-gray-700">
              テンプレート選択
            </label>
            <select
              name="templateId"
              id="templateId"
              value={formData.templateId}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">カスタムメール</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              件名 *
            </label>
            <input
              type="text"
              name="subject"
              id="subject"
              required
              value={formData.subject}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              本文 *
            </label>
            <textarea
              name="content"
              id="content"
              required
              rows={10}
              value={formData.content}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              送信先選択（複数選択可能）
            </label>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeAll"
                  checked={formData.includeAll}
                  onChange={(e) => setFormData(prev => ({...prev, includeAll: e.target.checked}))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="includeAll" className="ml-2 block text-sm text-gray-900">
                  全顧客 ({customers.length}名)
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              タグで絞り込み（複数選択可）
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`tag-${tag.id}`}
                    checked={formData.selectedTagIds.includes(tag.id)}
                    onChange={(e) => handleTagSelection(tag.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`tag-${tag.id}`} className="ml-2 flex items-center text-sm text-gray-900">
                    <div 
                      className="h-3 w-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              選択中: {formData.selectedTagIds.length}件
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              コースで絞り込み（複数選択可）
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`course-${course.id}`}
                    checked={formData.selectedCourseIds.includes(course.id)}
                    onChange={(e) => handleCourseSelection(course.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`course-${course.id}`} className="ml-2 text-sm text-gray-900">
                    {course.name} (¥{course.price.toLocaleString()})
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-600">
              選択中: {formData.selectedCourseIds.length}件
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              個別選択 ({customers.length}件の顧客)
            </label>
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
              <div className="p-3 space-y-2">
                {customers.length === 0 ? (
                  <div className="text-gray-500 text-sm">顧客データがありません</div>
                ) : (
                  customers.map((customer) => (
                    <div key={customer.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.selectedCustomerIds.includes(customer.id)}
                        onChange={(e) => handleCustomerSelection(customer.id, e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        {customer.name} ({customer.email})
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              選択中: {formData.selectedCustomerIds.length}件
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-blue-900">送信対象者プレビュー</h3>
              <span className="text-sm text-blue-700 font-semibold">
                合計: {previewCustomers.length}名
              </span>
            </div>
            
            {previewCustomers.length > 0 ? (
              <div className="max-h-32 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-blue-800">
                  {previewCustomers.slice(0, 20).map((customer) => (
                    <div key={customer.id} className="truncate">
                      • {customer.name} ({customer.email})
                    </div>
                  ))}
                  {previewCustomers.length > 20 && (
                    <div className="col-span-2 text-center text-blue-600 mt-1">
                      ... 他{previewCustomers.length - 20}名
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-blue-700">
                送信対象が選択されていません
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="submit">
              プレビューを確認
            </Button>
          </div>
        </form>
      </div>
      ) : (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">一括メール送信プレビュー</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">送信先:</span>
                    <div className="text-gray-900">{previewCustomers.length}名の顧客</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">件名:</span>
                    <div className="text-gray-900">{formData.subject}</div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="font-medium text-gray-700 mb-2">送信対象顧客:</div>
                <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded border">
                  {previewCustomers.map((customer, index) => (
                    <div key={customer.id} className="text-sm text-gray-900">
                      {index + 1}. {customer.name} ({customer.email})
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 mb-2">メール本文:</div>
                <div className="bg-gray-50 p-4 rounded border text-gray-900 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {formData.content}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPreview(false)}
              >
                戻って編集
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sending ? '送信中...' : `${previewCustomers.length}名にメール送信`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}