'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>('')
  const [dbSetupLoading, setDbSetupLoading] = useState(false)
  const [dbSetupResult, setDbSetupResult] = useState<string>('')
  const [completeSetupLoading, setCompleteSetupLoading] = useState(false)
  const [completeSetupResult, setCompleteSetupResult] = useState<string>('')

  const handleSetupDatabase = async () => {
    setDbSetupLoading(true)
    setDbSetupResult('')

    try {
      const response = await fetch('/api/setup-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        setDbSetupResult(`✅ データベースセットアップ成功: ${data.message}`)
      } else {
        setDbSetupResult(`❌ データベースエラー: ${data.error}`)
      }
    } catch (error) {
      setDbSetupResult(`❌ 接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDbSetupLoading(false)
    }
  }

  const handleSetupAdmin = async () => {
    setLoading(true)
    setResult('')

    try {
      const response = await fetch('/api/setup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        setResult(`✅ 成功: ${data.message}\n\nログイン情報:\nメールアドレス: admin@example.com\nパスワード: admin123`)
      } else {
        setResult(`❌ エラー: ${data.error}`)
      }
    } catch (error) {
      setResult(`❌ 接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteSetup = async () => {
    setCompleteSetupLoading(true)
    setCompleteSetupResult('')

    try {
      const response = await fetch('/api/setup-complete-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorText = await response.text()
        setCompleteSetupResult(`❌ セットアップエラー: ${response.status} - ${errorText}`)
        return
      }

      const data = await response.json()
      setCompleteSetupResult(`✅ 完全セットアップ成功: ${data.message}`)

    } catch (error) {
      setCompleteSetupResult(`❌ 接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCompleteSetupLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            CRMシステム 初期セットアップ
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            管理者アカウントを作成します
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <Button
                onClick={handleSetupDatabase}
                disabled={dbSetupLoading}
                variant="outline"
                className="w-full"
              >
                {dbSetupLoading ? 'セットアップ中...' : '1. データベースセットアップ'}
              </Button>
              
              <Button
                onClick={handleSetupAdmin}
                disabled={loading || !dbSetupResult.includes('✅')}
                className="w-full"
              >
                {loading ? '作成中...' : '2. 管理者アカウントを作成'}
              </Button>

              <Button
                onClick={handleCompleteSetup}
                disabled={completeSetupLoading || (!result.includes('✅') && !result.includes('既に存在します'))}
                variant="secondary"
                className="w-full"
              >
                {completeSetupLoading ? 'セットアップ中...' : '3. 完全セットアップ（全テーブル作成）'}
              </Button>
            </div>

            {dbSetupResult && (
              <div className={`p-4 rounded-md ${dbSetupResult.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <pre className="whitespace-pre-wrap text-sm">{dbSetupResult}</pre>
              </div>
            )}

            {result && (
              <div className={`p-4 rounded-md ${result.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <pre className="whitespace-pre-wrap text-sm">{result}</pre>
              </div>
            )}

            {completeSetupResult && (
              <div className={`p-4 rounded-md ${completeSetupResult.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <pre className="whitespace-pre-wrap text-sm">{completeSetupResult}</pre>
              </div>
            )}

            {(result.includes('✅') || completeSetupResult.includes('✅')) && (
              <div className="text-center">
                <a
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  ログインページへ
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}