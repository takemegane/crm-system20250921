'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { canAccessAdminFeatures, UserRole, hasPermission } from '@/lib/permissions'
import { useSystemSettings } from '@/contexts/SystemSettingsContext'
import Image from 'next/image'

interface NavigationSection {
  title: string
  items: Array<{
    name: string
    href: string
    current: boolean
  }>
}

const navigationSections: NavigationSection[] = [
  {
    title: '',
    items: [
      { name: 'ダッシュボード', href: '/dashboard', current: false },
    ]
  },
  {
    title: '顧客メニュー',
    items: [
      { name: '顧客管理', href: '/dashboard/customers', current: false },
      { name: 'アーカイブ済み顧客', href: '/dashboard/customers/archived', current: false },
      { name: 'コース管理', href: '/dashboard/courses', current: false },
      { name: 'タグ管理', href: '/dashboard/tags', current: false },
      { name: 'Month Challenge', href: '/dashboard/challenge', current: false },
    ]
  },
  {
    title: '商品メニュー',
    items: [
      { name: '商品管理', href: '/dashboard/products', current: false },
      { name: 'カテゴリ管理', href: '/dashboard/categories', current: false },
      { name: '注文管理', href: '/dashboard/orders', current: false },
      { name: '売上レポート', href: '/dashboard/sales-reports', current: false },
      { name: '決済ログ', href: '/dashboard/payment-logs', current: false },
      { name: '送料設定', href: '/dashboard/shipping-rates', current: false },
      { name: '決済設定', href: '/dashboard/payment-settings', current: false },
    ]
  },
  {
    title: 'メールメニュー',
    items: [
      { name: '一括メール配信', href: '/dashboard/bulk-email', current: false },
      { name: 'メール送信履歴', href: '/dashboard/email-logs', current: false },
      { name: 'メールテンプレート', href: '/dashboard/email-templates', current: false },
      { name: 'メール設定', href: '/dashboard/email-settings', current: false },
    ]
  },
  {
    title: 'システムメニュー',
    items: [
      { name: 'システム設定', href: '/dashboard/system-settings', current: false },
      { name: 'カスタムリンク管理', href: '/dashboard/custom-links', current: false },
      { name: '管理者管理', href: '/dashboard/admins', current: false },
      { name: '操作履歴', href: '/dashboard/audit-logs', current: false },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { settings } = useSystemSettings()

  const shouldShowItem = (href: string) => {
    if (href === '/dashboard/customers/archived') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'RESTORE_CUSTOMERS')
    }
    if (href === '/dashboard/admins') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_ADMINS')
    }
    if (href === '/dashboard/email-templates') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_EMAIL_TEMPLATES')
    }
    if (href === '/dashboard/bulk-email') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'SEND_BULK_EMAIL')
    }
    if (href === '/dashboard/email-logs') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_EMAIL_LOGS')
    }
    if (href === '/dashboard/email-settings') {
      return session?.user?.role === 'OWNER'
    }
    if (href === '/dashboard/payment-settings') {
      return session?.user?.role === 'OWNER'
    }
    if (href === '/dashboard/system-settings') {
      return session?.user?.role === 'OWNER'
    }
    if (href === '/dashboard/custom-links') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_CUSTOM_LINKS')
    }
    if (href === '/dashboard/audit-logs') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_AUDIT_LOGS')
    }
    if (href === '/dashboard/categories') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_PRODUCTS')
    }
    if (href === '/dashboard/orders') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_CUSTOMERS')
    }
    if (href === '/dashboard/challenge') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_CUSTOMERS')
    }
    if (href === '/dashboard/shipping-rates') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_PRODUCTS')
    }
    if (href === '/dashboard/sales-reports') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_REPORTS')
    }
    if (href === '/dashboard/payment-logs') {
      return session?.user?.role && hasPermission(session.user.role as UserRole, 'VIEW_PAYMENT_LOGS')
    }
    return true
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 sidebar-modern">
      <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
        {/* ロゴエリア */}
        <div className="px-4 mb-8">
          <div className="flex items-center">
            {settings?.logoUrl ? (
              <div className="h-10 w-10 rounded-xl overflow-hidden mr-3 shadow-lg">
                <Image
                  src={settings.logoUrl}
                  alt={settings.systemName}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center mr-3 shadow-lg"
                style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)' }}
              >
                <span className="text-white font-bold text-lg">
                  {settings?.systemName?.charAt(0) || 'C'}
                </span>
              </div>
            )}
            <div className="text-white font-semibold text-lg">
              {settings?.systemName || '管理システム'}
            </div>
          </div>
        </div>

        <nav className="flex-1 px-2">
          {navigationSections.map((section) => {
            const visibleItems = section.items.filter(item => shouldShowItem(item.href))
            
            if (visibleItems.length === 0) {
              return null
            }

            return (
              <div key={section.title || 'main'}>
                {section.title && (
                  <div className="px-3 py-2 mt-6 mb-2">
                    <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                )}
                {visibleItems.map((item) => {
                  const isCurrent = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'sidebar-item',
                        isCurrent ? 'active' : ''
                      )}
                    >
                      <span className="flex-shrink-0 mr-3">
                        {getMenuIcon(item.href)}
                      </span>
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

function getMenuIcon(href: string) {
  switch (href) {
    case '/dashboard':
      return <span className="text-lg">📊</span>
    case '/dashboard/customers':
      return <span className="text-lg">👥</span>
    case '/dashboard/customers/archived':
      return <span className="text-lg">🗃️</span>
    case '/dashboard/courses':
      return <span className="text-lg">📚</span>
    case '/dashboard/products':
      return <span className="text-lg">📦</span>
    case '/dashboard/categories':
      return <span className="text-lg">📁</span>
    case '/dashboard/orders':
      return <span className="text-lg">📋</span>
    case '/dashboard/shipping-rates':
      return <span className="text-lg">🚚</span>
    case '/dashboard/payment-settings':
      return <span className="text-lg">💳</span>
    case '/dashboard/tags':
      return <span className="text-lg">🏷️</span>
    case '/dashboard/bulk-email':
      return <span className="text-lg">📧</span>
    case '/dashboard/email-logs':
      return <span className="text-lg">📋</span>
    case '/dashboard/email-templates':
      return <span className="text-lg">📝</span>
    case '/dashboard/email-settings':
      return <span className="text-lg">📧</span>
    case '/dashboard/system-settings':
      return <span className="text-lg">⚙️</span>
    case '/dashboard/custom-links':
      return <span className="text-lg">🔗</span>
    case '/dashboard/admins':
      return <span className="text-lg">👨‍💼</span>
    case '/dashboard/audit-logs':
      return <span className="text-lg">🔍</span>
    case '/dashboard/sales-reports':
      return <span className="text-lg">📈</span>
    case '/dashboard/payment-logs':
      return <span className="text-lg">💰</span>
    default:
      return <span className="text-lg">•</span>
  }
}
