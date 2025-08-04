'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Customer = {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  joinedAt: string
}

type EmailTemplate = {
  id: string
  name: string
  subject: string
  content: string
  isDefault: boolean
  isActive: boolean
}

export default function SendEmailPage() {
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [formData, setFormData] = useState({
    templateId: '',
    subject: '',
    content: ''
  })
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // Fetch customer data
      const customerResponse = await fetch(`/api/customers/${params.id}`)
      if (!customerResponse.ok) {
        throw new Error('Failed to fetch customer')
      }
      const customerData = await customerResponse.json()
      setCustomer(customerData)

      // Fetch email templates
      const templatesResponse = await fetch('/api/email-templates')
      if (!templatesResponse.ok) {
        throw new Error('Failed to fetch templates')
      }
      const templatesData = await templatesResponse.json()
      setTemplates(templatesData.filter((template: EmailTemplate) => template.isActive))

      // Set default template if available
      const defaultTemplate = templatesData.find((template: EmailTemplate) => template.isDefault && template.isActive)
      if (defaultTemplate) {
        setFormData({
          templateId: defaultTemplate.id,
          subject: replacePlaceholders(defaultTemplate.subject, customerData),
          content: replacePlaceholders(defaultTemplate.content, customerData)
        })
      }
    } catch (error) {
      setError('データの取得に失敗しました')
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const replacePlaceholders = (text: string, customer: Customer): string => {
    return text
      .replace(/\{\{customer_name\}\}/g, customer.name)
      .replace(/\{\{customer_email\}\}/g, customer.email)
      .replace(/\{\{customer_phone\}\}/g, customer.phone || '')
      .replace(/\{\{customer_address\}\}/g, customer.address || '')
      .replace(/\{\{customer_joined_date\}\}/g, new Date(customer.joinedAt).toLocaleDateString('ja-JP'))
  }

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template && customer) {
      setFormData({
        templateId,
        subject: replacePlaceholders(template.subject, customer),
        content: replacePlaceholders(template.content, customer)
      })
    } else {
      setFormData({
        templateId: '',
        subject: '',
        content: ''
      })
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

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.subject || !formData.content) {
      setError('件名と本文を入力してください')
      return
    }

    setError('')
    setShowPreview(true)
  }

  const handleSend = async () => {
    setSending(true)
    setError('')

    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: formData.templateId || null,
          customerId: customer?.id,
          subject: formData.subject,
          content: formData.content,
          recipientEmail: customer?.email,
          recipientName: customer?.name
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'メールの送信に失敗しました')
      }

      alert('メールを送信しました')
      router.push(`/dashboard/customers/${customer?.id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'メールの送信に失敗しました')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center mt-8">
        <p className="text-red-600 mb-4">顧客が見つかりません</p>
        <Link href="/dashboard/customers">
          <Button variant="outline">顧客一覧に戻る</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link href={`/dashboard/customers/${customer.id}`} className="text-primary-600 hover:text-primary-700 text-sm">
          ← 顧客詳細に戻る
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">メール送信</h1>
        <p className="text-gray-600">
          {customer.name}様（{customer.email}）にメールを送信します。
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
                rows={12}
                value={formData.content}
                onChange={handleInputChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Link href={`/dashboard/customers/${customer.id}`}>
                <Button type="button" variant="outline">
                  キャンセル
                </Button>
              </Link>
              <Button type="submit">
                プレビューを確認
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white shadow sm:rounded-lg">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">メール送信プレビュー</h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">宛先:</span>
                    <div className="text-gray-900">{customer.name} ({customer.email})</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">件名:</span>
                    <div className="text-gray-900">{formData.subject}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-700 mb-2">本文:</div>
                <div className="bg-gray-50 p-4 rounded border text-gray-900 whitespace-pre-wrap">
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
                {sending ? '送信中...' : 'メールを送信'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}