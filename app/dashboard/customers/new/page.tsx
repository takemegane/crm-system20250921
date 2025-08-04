'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { formatAge } from '@/lib/age-utils'

export default function NewCustomerPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    nameKana: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    gender: '',
    joinedAt: new Date().toISOString().split('T')[0] // 今日の日付をYYYY-MM-DD形式で設定
  })
  const [courses, setCourses] = useState<Array<{id: string, name: string, price: number}>>([])
  const [tags, setTags] = useState<Array<{id: string, name: string, color: string}>>([])
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, tagsRes] = await Promise.all([
          fetch('/api/courses'),
          fetch('/api/tags')
        ])
        
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json()
          setCourses(coursesData.filter((course: any) => course.isActive))
        }
        
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json()
          setTags(tagsData)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    
    fetchData()
  }, [])

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

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
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
          courseIds: selectedCourses,
          tagIds: selectedTags,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '顧客の登録に失敗しました')
      }

      // 登録成功後、顧客一覧ページに戻る
      router.push('/dashboard/customers')
      router.refresh()
    } catch (error) {
      console.error('Error creating customer:', error)
      setError(error instanceof Error ? error.message : '顧客の登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">新規顧客登録</h1>
        <p className="mt-2 text-gray-600">
          新しい顧客の情報を入力してください。
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
              placeholder="山田太郎"
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
              placeholder="yamada@example.com"
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
              placeholder="090-1234-5678"
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
              placeholder="東京都渋谷区..."
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

          {/* コース選択 */}
          {courses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                申し込みコース
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タグ
              </label>
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
              disabled={loading}
              className="flex-1"
            >
              {loading ? '登録中...' : '顧客を登録'}
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