'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'
import { useTags, useDeleteTag } from '@/hooks/use-tags'

type Tag = {
  id: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
  customerTags: {
    id: string
    customer: {
      id: string
      name: string
    }
  }[]
}

export default function TagsPage() {
  const { data: session, status } = useSession()
  const [downloading, setDownloading] = useState(false)

  // キャッシュされたデータを使用
  const { data: tags = [], isLoading: tagsLoading, error: tagsError } = useTags()
  const deleteTagMutation = useDeleteTag()

  const handleDeleteTag = async (id: string) => {
    if (!confirm('このタグを削除しますか？')) {
      return
    }

    try {
      await deleteTagMutation.mutateAsync(id)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'タグの削除に失敗しました')
    }
  }

  const handleDownloadCSV = async () => {
    try {
      setDownloading(true)
      const response = await fetch('/api/tags/export')
      
      if (!response.ok) {
        throw new Error('CSV download failed')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `tags_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Error downloading CSV:', error)
      alert('CSVダウンロードに失敗しました')
    } finally {
      setDownloading(false)
    }
  }

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

  const canDeleteTags = session?.user?.role && hasPermission(session.user.role as UserRole, 'DELETE_TAGS')

  if (tagsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (tagsError) {
    return (
      <div className="text-center text-red-600 mt-8">
        <p>タグデータの取得に失敗しました</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">タグ管理</h1>
          <p className="mt-2 text-gray-600">
            顧客に付与するタグの作成、編集、削除ができます。
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleDownloadCSV}
            disabled={downloading || tags.length === 0}
          >
            {downloading ? 'ダウンロード中...' : 'CSVダウンロード'}
          </Button>
          <Link href="/dashboard/tags/new">
            <Button>
              新規タグ作成
            </Button>
          </Link>
        </div>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">
            まだタグが登録されていません
          </div>
          <Link href="/dashboard/tags/new">
            <Button className="mt-4">
              最初のタグを作成する
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {tags.map((tag: Tag) => (
              <li key={tag.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div 
                            className="h-4 w-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {tag.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            作成日: {new Date(tag.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500 mr-4">
                        カラー: {tag.color}
                      </div>
                      <Link href={`/dashboard/tags/${tag.id}/edit`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                        >
                          編集
                        </Button>
                      </Link>
                      {canDeleteTags && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTag(tag.id)}
                          disabled={deleteTagMutation.isPending}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          {deleteTagMutation.isPending ? '削除中...' : '削除'}
                        </Button>
                      )}
                    </div>
                  </div>
                  {tag.customerTags.length > 0 && (
                    <div className="mt-2 ml-8">
                      <div className="text-sm text-gray-600">
                        付与済み顧客: {tag.customerTags.slice(0, 3).map((customerTag: any) => customerTag.customer.name).join(', ')}
                        {tag.customerTags.length > 3 && ` 他${tag.customerTags.length - 3}人`}
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}