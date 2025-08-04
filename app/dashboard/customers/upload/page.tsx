'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function UploadCustomersPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    message: string
    results?: {
      success: number
      failed: number
      errors: string[]
    }
  } | null>(null)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('ファイルを選択してください')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/customers/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'アップロードに失敗しました')
      }

      setResult(data)
    } catch (error) {
      console.error('Error uploading file:', error)
      setError(error instanceof Error ? error.message : 'アップロードに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleCSV = `name,email,phone,address,joinedAt,courses,tags
山田太郎,yamada@example.com,090-1234-5678,東京都渋谷区,2024-01-15,ベーシックコース;アドバンスコース,VIP;新規
佐藤花子,sato@example.com,080-9876-5432,大阪府大阪市,2024-02-20,プレミアムコース,優良顧客
田中次郎,tanaka@example.com,,神奈川県横浜市,,ベーシックコース,`
    
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'sample_customers.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">顧客一括登録（CSV）</h1>
        <p className="mt-2 text-gray-600">
          CSVファイルを使用して複数の顧客を一度に登録できます。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* アップロードエリア */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">CSVファイルアップロード</h2>
          
          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  選択されたファイル: {file.name}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {result && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                <p className="font-medium">{result.message}</p>
                {result.results && result.results.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">エラー詳細:</p>
                    <ul className="text-sm list-disc list-inside mt-1">
                      {result.results.errors.slice(0, 5).map((err, index) => (
                        <li key={index}>{err}</li>
                      ))}
                      {result.results.errors.length > 5 && (
                        <li>...他 {result.results.errors.length - 5} 件</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={handleUpload}
                disabled={!file || loading}
                className="flex-1"
              >
                {loading ? 'アップロード中...' : 'アップロード'}
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
          </div>
        </div>

        {/* 説明とサンプル */}
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">CSVファイル形式</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>必須カラム:</strong> name, email</p>
              <p><strong>任意カラム:</strong> phone, address, joinedAt, courses, tags</p>
              <p><strong>日付形式:</strong> YYYY-MM-DD（例: 2024-01-15）</p>
              <p><strong>コース/タグ:</strong> セミコロン(;)区切りで複数指定可能</p>
              <p><strong>文字コード:</strong> UTF-8</p>
            </div>
            <Button
              onClick={downloadSampleCSV}
              variant="outline"
              className="mt-4"
            >
              サンプルCSVをダウンロード
            </Button>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">CSVサンプル</h3>
            <pre className="text-sm bg-gray-50 p-3 rounded border overflow-x-auto">
{`name,email,phone,address,joinedAt,courses,tags
山田太郎,yamada@example.com,090-1234-5678,東京都渋谷区,2024-01-15,ベーシックコース;アドバンスコース,VIP;新規
佐藤花子,sato@example.com,080-9876-5432,大阪府大阪市,2024-02-20,プレミアムコース,優良顧客
田中次郎,tanaka@example.com,,神奈川県横浜市,,ベーシックコース,`}
            </pre>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-3">注意事項</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• 既存のメールアドレスは重複エラーでスキップされます</li>
              <li>• joinedAtが空の場合は今日の日付が設定されます</li>
              <li>• 最大1000件まで一度に処理できます</li>
              <li>• エラーがあった行は登録されません</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}