'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

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

type CartItem = {
  items: any[]
  total: number
  itemCount: number
}

type SystemSettings = {
  systemName: string
  primaryColor?: string
  secondaryColor?: string
  backgroundColor?: string
  logoUrl?: string
}

export default function ShopPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [cart, setCart] = useState<CartItem>({ items: [], total: 0, itemCount: 0 })
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ systemName: 'ECショップ' })

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(category && { category })
      })

      const response = await fetch(`/api/products?${params}`)
      
      if (!response.ok) {
        throw new Error('商品の取得に失敗しました')
      }

      const data = await response.json()
      setProducts(data.products)
    } catch (error) {
      console.error('Error fetching products:', error)
      setError(error instanceof Error ? error.message : '商品の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [search, category])

  const fetchCart = useCallback(async () => {
    try {
      const response = await fetch('/api/cart')
      
      if (response.ok) {
        const data = await response.json()
        setCart(data)
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [fetchProducts, fetchCategories])

  useEffect(() => {
    if (session?.user?.userType === 'customer') {
      fetchCart()
    }
  }, [fetchCart, session?.user?.userType])

  // システム設定を取得
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await fetch('/api/system-settings')
        if (response.ok) {
          const settings = await response.json()
          setSystemSettings(settings)
        }
      } catch (error) {
        console.error('Error fetching system settings:', error)
      }
    }
    fetchSystemSettings()
  }, [])

  const addToCart = async (productId: string) => {
    if (!session?.user || session.user.userType !== 'customer') {
      alert('カートに追加するにはログインが必要です')
      return
    }

    setAddingToCart(productId)
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          quantity: 1
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'カートに追加できませんでした')
      }

      await fetchCart()
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
                    alt={systemSettings.systemName}
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
              <h1 className="text-2xl font-bold text-gray-900">{systemSettings.systemName}</h1>
            </div>
            <div className="flex items-center space-x-4">
              {session?.user ? (
                <>
                  <span className="text-sm text-gray-600">
                    こんにちは、{session.user.name}さん
                  </span>
                  <Link href="/mypage">
                    <Button variant="outline">🏠 マイページ</Button>
                  </Link>
                  <Link href="/shop/cart">
                    <Button variant="outline" className="relative">
                      カート
                      {cart.itemCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cart.itemCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link href="/shop/orders">
                    <Button variant="outline">注文履歴</Button>
                  </Link>
                  <Link href="/shop/profile">
                    <Button variant="outline">アカウント</Button>
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
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-16">
            <div className="text-lg">読み込み中...</div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-600">
            <p>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p>商品が見つかりません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
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
                      onClick={() => addToCart(product.id)}
                      disabled={product.stock === 0 || addingToCart === product.id}
                      size="sm"
                    >
                      {addingToCart === product.id ? (
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