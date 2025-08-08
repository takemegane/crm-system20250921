'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import SalesReport from '@/components/dashboard/SalesReport'
import QuickStats from '@/components/dashboard/QuickStats'
import RecentOrders from '@/components/dashboard/RecentOrders'
import CustomerStats from '@/components/dashboard/CustomerStats'

type DashboardWidget = {
  id: string
  title: string
  type: 'sales-report' | 'quick-stats' | 'recent-orders' | 'customer-stats'
  enabled: boolean
  order: number
  size: 'small' | 'medium' | 'large'
}

function WidgetSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          <div className="h-3 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [menuLinks, setMenuLinks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardSettings()
  }, [])

  const fetchDashboardSettings = async () => {
    try {
      const response = await fetch('/api/system-settings')
      if (response.ok) {
        const settings = await response.json()
        if (settings.dashboardWidgets && Array.isArray(settings.dashboardWidgets)) {
          // 有効なウィジェットのみ、並び順でソート
          const enabledWidgets = settings.dashboardWidgets
            .filter((widget: DashboardWidget) => widget.enabled)
            .sort((a: DashboardWidget, b: DashboardWidget) => a.order - b.order)
          setWidgets(enabledWidgets)
        } else {
          // デフォルトウィジェット設定
          setWidgets([
            {
              id: 'sales-report',
              title: '売上レポート',
              type: 'sales-report',
              enabled: true,
              order: 1,
              size: 'large'
            },
            {
              id: 'quick-stats',
              title: 'クイック統計',
              type: 'quick-stats',
              enabled: true,
              order: 2,
              size: 'medium'
            },
            {
              id: 'recent-orders',
              title: '最近の注文',
              type: 'recent-orders',
              enabled: true,
              order: 3,
              size: 'medium'
            }
          ])
        }

        // メニューリンク設定を読み込み
        if (settings.menuLinks && Array.isArray(settings.menuLinks)) {
          // 有効なメニューリンクのみ、並び順でソート
          const enabledLinks = settings.menuLinks
            .filter((link: any) => link.enabled)
            .sort((a: any, b: any) => a.order - b.order)
          setMenuLinks(enabledLinks)
        } else {
          // デフォルトメニューリンク
          setMenuLinks([
            { id: 'customers', title: '👥 顧客管理', url: '/dashboard/customers', enabled: true, order: 1 },
            { id: 'products', title: '🛍️ 商品管理', url: '/dashboard/products', enabled: true, order: 2 },
            { id: 'orders', title: '📦 注文管理', url: '/dashboard/orders', enabled: true, order: 3 }
          ])
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard settings:', error)
      setError('ダッシュボード設定の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const renderWidget = (widget: DashboardWidget) => {
    const sizeClass = {
      'small': 'col-span-1',
      'medium': 'col-span-1 md:col-span-2',
      'large': 'col-span-1 md:col-span-2 lg:col-span-3'
    }[widget.size]

    const component = (() => {
      switch (widget.type) {
        case 'sales-report':
          return <SalesReport className={sizeClass} />
        case 'quick-stats':
          return <QuickStats className={sizeClass} />
        case 'recent-orders':
          return <RecentOrders className={sizeClass} />
        case 'customer-stats':
          return <CustomerStats className={sizeClass} />
        default:
          return null
      }
    })()

    return (
      <div key={widget.id} className={sizeClass}>
        <Suspense fallback={<WidgetSkeleton />}>
          {component}
        </Suspense>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
            <p className="mt-2 text-gray-600">
              管理システムへようこそ。顧客情報の管理とコース運営を効率的に行えます。
            </p>
          </div>
          {session?.user?.role === 'OWNER' && (
            <Link href="/dashboard/system-settings">
              <Button variant="outline" size="sm">
                ⚙️ ダッシュボード設定
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <WidgetSkeleton />
          <WidgetSkeleton />
          <WidgetSkeleton />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* カスタマイズされたウィジェット */}
          {widgets.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {widgets.map(renderWidget)}
            </div>
          )}

          {/* カスタマイズ可能なクイックアクセス */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">クイックアクセス</h2>
            
            {menuLinks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {menuLinks.map((link) => (
                  <Link key={link.id} href={link.url}>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{link.title.split(' ')[0]}</div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{link.title.slice(2)}</h3>
                          <p className="text-sm text-gray-500">管理画面に移動</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>メニューリンクが設定されていません。</p>
                {session?.user?.role === 'OWNER' && (
                  <Link href="/dashboard/system-settings">
                    <Button className="mt-4">
                      ⚙️ システム設定でメニューを設定
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}