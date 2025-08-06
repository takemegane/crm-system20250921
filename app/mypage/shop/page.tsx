'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { useCart, useAddToCart } from '@/hooks/use-cart'
import { useSystemSettings } from '@/hooks/use-system-settings'

type Product = {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  categoryId?: string
  sortOrder: number
  category?: {
    id: string
    name: string
  }
  isActive: boolean
}

export default function ShopPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  
  // TanStack Query hooks を使用
  const { data: productsData, isLoading: productsLoading, error: productsError } = useProducts({ search, category })
  const { data: categoriesData } = useCategories()
  const { data: cart } = useCart()
  const { data: systemSettings } = useSystemSettings()
  const addToCartMutation = useAddToCart()

  // キャッシュシステムを使用するため、手動のfetch関数は不要

  useEffect(() => {
    if (session === undefined) {
      // セッション読み込み中は何もしない
      return
    }
    
    if (session?.user?.userType === 'admin') {
      router.push('/dashboard')
    } else if (session === null) {
      // セッションが明示的にnullの場合のみログインページにリダイレクト
      router.push('/login')
    }
  }, [session, router])

  const handleAddToCart = async (productId: string) => {
    if (!session?.user || session.user.userType !== 'customer') {
      alert('カートに追加するにはログインが必要です')
      return
    }

    setAddingToCart(productId)
    try {
      await addToCartMutation.mutateAsync({
        productId,
        quantity: 1
      })
      alert('カートに追加しました')
    } catch (error) {
      console.error('Error adding to cart:', error)
      alert(error instanceof Error ? error.message : 'カートに追加できませんでした')
    } finally {
      setAddingToCart(null)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(price)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {systemSettings?.logoUrl ? (
                <div className="h-10 w-10 rounded-xl overflow-hidden mr-3 shadow-lg">
                  <Image
                    src={systemSettings.logoUrl}
                    alt={systemSettings?.systemName || 'CRMシステム'}
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
                    {systemSettings?.systemName?.charAt(0) || 'S'}
                  </span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{systemSettings?.systemName || 'CRMシステム'}</h1>
            </div>
            <div className="flex items-center space-x-4">
              {session?.user ? (
                <>
                  <span className="text-sm text-gray-600">
                    こんにちは、{session.user.name}さん
                  </span>
                  <Link href="/mypage/shop/cart">
                    <Button variant="outline" className="relative">
                      カート
                      {cart?.itemCount && cart.itemCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cart.itemCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link href="/mypage/shop/orders">
                    <Button variant="outline">注文履歴</Button>
                  </Link>
                  <Link href="/mypage/profile">
                    <Button variant="outline">アカウント</Button>
                  </Link>
                  <Link href="/mypage">
                    <Button variant="outline">🏠 マイページ</Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    ログアウト
                  </Button>
                </>
              ) : (
                <Link href="/login">
                  <Button>ログイン</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                商品検索
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="商品名を入力..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリ
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">全てのカテゴリ</option>
                {categoriesData?.categories?.map((cat: { id: string, name: string }) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                )) || []}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {productsLoading ? (
          <div className="text-center py-16">
            <div className="text-lg">読み込み中...</div>
          </div>
        ) : productsError ? (
          <div className="text-center py-16 text-red-600">
            <p>商品の取得に失敗しました</p>
          </div>
        ) : !productsData?.products || productsData.products.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>商品が見つかりません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {productsData.products.map((product: Product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                {product.imageUrl && (
                  <div className="aspect-w-1 aspect-h-1 w-full">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {product.name}
                  </h3>
                  {product.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    {product.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {product.category.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      在庫: {product.stock}個
                    </span>
                    <Button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={product.stock === 0 || addingToCart === product.id || addToCartMutation.isPending}
                      size="sm"
                    >
                      {addingToCart === product.id || addToCartMutation.isPending ? (
                        '追加中...'
                      ) : product.stock === 0 ? (
                        '在庫切れ'
                      ) : (
                        'カートに追加'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}