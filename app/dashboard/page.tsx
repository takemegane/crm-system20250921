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

          {/* デフォルトのクイックアクセス */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">クイックアクセス</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    顧客管理
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    顧客情報の確認・編集
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/dashboard/customers">
                <Button className="w-full">
                  顧客一覧を見る
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    コース管理
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    コース情報の管理
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/dashboard/courses">
                <Button className="w-full" variant="secondary">
                  コース一覧を見る
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    注文管理
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    注文状況の確認・管理
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/dashboard/orders">
                <Button className="w-full" variant="outline">
                  注文一覧を見る
                </Button>
              </Link>
            </div>
          </div>
        </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}