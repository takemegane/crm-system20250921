'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

type EmailTemplate = {
  id: string
  name: string
  subject: string
  content: string
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export default function EmailTemplatesPage() {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const canCreate = session?.user?.role && hasPermission(session.user.role as UserRole, 'CREATE_EMAIL_TEMPLATES')
  const canEdit = session?.user?.role && hasPermission(session.user.role as UserRole, 'EDIT_EMAIL_TEMPLATES')
  const canDelete = session?.user?.role && hasPermission(session.user.role as UserRole, 'DELETE_EMAIL_TEMPLATES')

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/email-templates')
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      const data = await response.json()
      setTemplates(data)
    } catch (error) {
      setError('メールテンプレートの取得に失敗しました')
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('このメールテンプレートを削除しますか？')) {
      return
    }

    try {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'テンプレートの削除に失敗しました')
      }

      fetchTemplates()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'テンプレートの削除に失敗しました')
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

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
          <h1 className="text-3xl font-bold text-gray-900">メールテンプレート管理</h1>
          <p className="mt-2 text-gray-600">
            メール送信で使用するテンプレートを管理します。
          </p>
        </div>
        {canCreate && (
          <Link href="/dashboard/email-templates/new">
            <Button>
              新規テンプレート作成
            </Button>
          </Link>
        )}
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            メールテンプレートが登録されていません
          </div>
          {canCreate && (
            <Link href="/dashboard/email-templates/new">
              <Button className="mt-4">
                最初のテンプレートを作成する
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {templates.map((template) => (
              <li key={template.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900">
                              {template.name}
                            </div>
                            {template.isDefault && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                デフォルト
                              </span>
                            )}
                            {!template.isActive && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                無効
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            件名: {template.subject}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            作成日: {new Date(template.createdAt).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <Link href={`/dashboard/email-templates/${template.id}/edit`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                          >
                            編集
                          </Button>
                        </Link>
                      )}
                      {canDelete && !template.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteTemplate(template.id)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          削除
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}