'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatAge } from '@/lib/age-utils'

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
    courseId: string
    course: {
      id: string
      name: string
      price: number
    }
  }>
  customerTags: Array<{
    id: string
    tagId: string
    tag: {
      id: string
      name: string
      color: string
    }
  }>
}

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    nameKana: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    gender: '',
    joinedAt: ''
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${params.id}`)
        
        if (response.ok) {
          const customerData = await response.json()
          setCustomer(customerData)
          setFormData({
            name: customerData.name,
            nameKana: customerData.nameKana || '',
            email: customerData.email,
            phone: customerData.phone || '',
            address: customerData.address || '',
            birthDate: customerData.birthDate ? customerData.birthDate.split('T')[0] : '',
            gender: customerData.gender || '',
            joinedAt: customerData.joinedAt.split('T')[0]
          })
        } else {
          setError('顧客データの取得に失敗しました')
        }
      } catch (error) {
        console.error('Error fetching customer:', error)
        setError('顧客データの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    
    fetchCustomer()
  }, [params.id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.nameKana.trim() || !formData.email.trim() || !formData.birthDate || !formData.gender || !formData.phone.trim() || !formData.address.trim()) {
      setError('全ての項目を入力してください')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/customers/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          nameKana: formData.nameKana.trim() || null,
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          birthDate: formData.birthDate || null,
          gender: formData.gender || null,
          joinedAt: formData.joinedAt,
          courseIds: customer?.enrollments.map(e => e.courseId) || [],
          tagIds: customer?.customerTags.map(ct => ct.tagId) || []
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '顧客の更新に失敗しました')
      }

      router.push(`/dashboard/customers/${params.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error updating customer:', error)
      setError(error instanceof Error ? error.message : '顧客の更新に失敗しました')
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

  if (!customer) {
    return (
      <div className="text-center text-red-600 mt-8">
        <p>顧客が見つかりません</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">顧客情報編集</h1>
        <p className="mt-2 text-gray-600">
          {customer.name} の情報を編集してください。
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="nameKana" className="block text-sm font-medium text-gray-700 mb-2">
              フリガナ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nameKana"
              name="nameKana"
              value={formData.nameKana}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="ヤマダタロウ"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-2">
              生年月日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              value={formData.birthDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
            {formData.birthDate && (
              <p className="mt-1 text-sm text-primary-600">
                現在の年齢: {formatAge(formData.birthDate)}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
              性別 <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">選択してください</option>
              <option value="男">男</option>
              <option value="女">女</option>
              <option value="未回答">未回答</option>
            </select>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              電話番号 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              住所 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="joinedAt" className="block text-sm font-medium text-gray-700 mb-2">
              入会日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="joinedAt"
              name="joinedAt"
              value={formData.joinedAt}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>


          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? '更新中...' : '顧客情報を更新'}
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
    </div>
  )
}