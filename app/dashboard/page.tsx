import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-2 text-gray-600">
          管理システムへようこそ。顧客情報の管理とコース運営を効率的に行えます。
        </p>
      </div>

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
  )
}