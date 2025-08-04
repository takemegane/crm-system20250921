'use client'

import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { hasPermission, UserRole } from '@/lib/permissions'

export default function Header() {
  const { data: session, status } = useSession()

  const handleLogout = async () => {
    try {
      // Log the logout action
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('Error logging logout:', error)
    } finally {
      // Always sign out regardless of logging success
      signOut({ callbackUrl: '/login' })
    }
  }
  
  // セッション読み込み中の場合
  if (status === 'loading') {
    return (
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              
            </div>
            <div className="text-sm text-gray-500">読み込み中...</div>
          </div>
        </div>
      </header>
    )
  }
  
  const canEditProfile = session?.user?.role && hasPermission(session.user.role as UserRole, 'EDIT_PROFILE')

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            
          </div>
          <div className="flex items-center space-x-4">
            {session?.user && (
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {session.user.name || 'ユーザー'}
                </div>
                <div className="text-xs text-gray-500">
                  {session.user.email}
                </div>
                <div className="text-xs text-gray-400">
                  {session.user.role === 'OPERATOR' ? '運営者' : session.user.role === 'ADMIN' ? '管理者' : 'オーナー権限'}
                </div>
              </div>
            )}
            {canEditProfile && (
              <Link href="/dashboard/profile">
                <Button variant="outline" size="sm">
                  プロフィール編集
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
            >
              ログアウト
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}