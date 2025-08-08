'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useSystemSettings } from '@/hooks/use-system-settings'
import { useEffect } from 'react'

interface MyPageLayoutProps {
  children: React.ReactNode
}

export default function MyPageLayout({ children }: MyPageLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { data: systemSettings } = useSystemSettings()

  useEffect(() => {
    if (status === 'loading') return // セッション読み込み中は何もしない
    
    if (!session) {
      router.push('/login')
      return
    }
    
    if (session.user?.userType === 'admin') {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (!session || session.user?.userType !== 'customer') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 固定ヘッダー */}
      <header className="bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 左側: システムロゴとシステム名 */}
            <div className="flex items-center">
              {systemSettings?.logoUrl ? (
                <div className="h-8 w-8 rounded-lg overflow-hidden mr-2 shadow-sm">
                  <Image
                    src={systemSettings.logoUrl}
                    alt={systemSettings?.systemName || 'システム'}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center mr-2 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)' }}
                >
                  <span className="text-white font-bold text-sm">
                    {systemSettings?.systemName?.charAt(0) || 'S'}
                  </span>
                </div>
              )}
              <span className="text-lg font-semibold text-gray-900">
                {systemSettings?.systemName || 'システム'}
              </span>
            </div>

            {/* 右側: ユーザー情報、マイページ、ログアウト */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-sm text-gray-600 hidden md:block">
                {session?.user?.name}さん
              </span>
              <Link href="/mypage">
                <Button variant="outline" size="sm" className="text-sm min-h-[44px] sm:min-h-auto">
                  <span className="hidden sm:inline">🏠 マイページ</span>
                  <span className="sm:hidden">🏠</span>
                </Button>
              </Link>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-sm min-h-[44px] sm:min-h-auto"
              >
                <span className="hidden sm:inline">ログアウト</span>
                <span className="sm:hidden">🚪</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ - ヘッダー分のマージンを追加 */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}