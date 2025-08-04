'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

const colorOptions = [
  { name: 'ブルー', value: '#3B82F6' },
  { name: 'グリーン', value: '#10B981' },
  { name: 'レッド', value: '#EF4444' },
  { name: 'イエロー', value: '#F59E0B' },
  { name: 'パープル', value: '#8B5CF6' },
  { name: 'ピンク', value: '#EC4899' },
  { name: 'インディゴ', value: '#6366F1' },
  { name: 'グレー', value: '#6B7280' },
]

type Tag = {
  id: string
  name: string
  color: string
  description?: string
}

export default function EditTagPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [tag, setTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    description: ''
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTag = async () => {
      try {
        const response = await fetch(`/api/tags/${params.id}`)
        if (response.ok) {
          const tagData = await response.json()
          setTag(tagData)
          setFormData({
            name: tagData.name,
            color: tagData.color,
            description: tagData.description || ''
          })
        } else {
          setError('タグが見つかりません')
        }
      } catch (error) {
        console.error('Error fetching tag:', error)
        setError('タグデータの取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }
    
    fetchTag()
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
    
    if (!formData.name.trim()) {
      setError('タグ名は必須です')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await fetch(`/api/tags/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          color: formData.color,
          description: formData.description.trim() || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'タグの更新に失敗しました')
      }

      router.push('/dashboard/tags')
      router.refresh()
    } catch (error) {
      console.error('Error updating tag:', error)
      setError(error instanceof Error ? error.message : 'タグの更新に失敗しました')
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

  if (!tag) {
    return (
      <div className="text-center text-red-600 mt-8">
        <p>タグが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">タグ編集</h1>
        <p className="mt-2 text-gray-600">
          {tag.name} の情報を編集してください。
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
              タグ名 <span className="text-red-500">*</span>
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
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              色
            </label>
            <select
              id="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            >
              {colorOptions.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center">
              <div 
                className="h-4 w-4 rounded-full mr-2"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-sm text-gray-600">プレビュー</span>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              説明
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? '更新中...' : 'タグを更新'}
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