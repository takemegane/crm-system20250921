'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function NewEmailTemplatePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    isDefault: false
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.subject || !formData.content) {
      setError('すべての項目を入力してください')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'テンプレートの作成に失敗しました')
      }

      router.push('/dashboard/email-templates')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'テンプレートの作成に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const insertPlaceholder = (placeholder: string) => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const before = text.substring(0, start)
    const after = text.substring(end, text.length)
    const newText = before + placeholder + after
    
    setFormData(prev => ({ ...prev, content: newText }))
    
    // カーソル位置を調整
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + placeholder.length
      textarea.focus()
    }, 0)
  }

  const placeholders = [
    { label: '顧客名', value: '{{customer_name}}' },
    { label: 'メールアドレス', value: '{{customer_email}}' },
    { label: '電話番号', value: '{{customer_phone}}' },
    { label: '住所', value: '{{customer_address}}' },
    { label: '入会日', value: '{{customer_joined_date}}' }
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">新規メールテンプレート作成</h1>
        <p className="mt-2 text-gray-600">
          メール送信で使用するテンプレートを作成します。
        </p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              テンプレート名 *
            </label>
            <input
              type="text"
              name="name"
              id="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="例：ウェルカムメール"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              メール件名 *
            </label>
            <input
              type="text"
              name="subject"
              id="subject"
              required
              value={formData.subject}
              onChange={handleChange}
              placeholder="例：{{customer_name}}様、ご入会ありがとうございます"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">
              メール本文 *
            </label>
            <div className="mt-1">
              <div className="mb-2">
                <div className="text-sm text-gray-600 mb-2">プレースホルダー:</div>
                <div className="flex flex-wrap gap-2">
                  {placeholders.map((placeholder) => (
                    <button
                      key={placeholder.value}
                      type="button"
                      onClick={() => insertPlaceholder(placeholder.value)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                    >
                      {placeholder.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                name="content"
                id="content"
                required
                rows={12}
                value={formData.content}
                onChange={handleChange}
                placeholder={`{{customer_name}}様

この度はご入会いただき、誠にありがとうございます。

お客様の情報:
- お名前: {{customer_name}}
- メールアドレス: {{customer_email}}
- 入会日: {{customer_joined_date}}

ご不明な点がございましたら、お気軽にお問い合わせください。

今後ともよろしくお願いいたします。`}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isDefault"
              id="isDefault"
              checked={formData.isDefault}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-900">
              デフォルトテンプレートに設定する
            </label>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? '作成中...' : 'テンプレートを作成'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}