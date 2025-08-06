'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission, UserRole } from '@/lib/permissions'

interface Category {
  id: string
  name: string
  description: string | null
  categoryType: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  _count: {
    products: number
  }
  shippingRate: {
    id: string
    shippingFee: number
    freeShippingThreshold: number | null
  } | null
}

export default function CategoriesPage() {
  const { data: session } = useSession()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryType: 'PHYSICAL',
    sortOrder: 0,
    isActive: true
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      } else {
        console.error('カテゴリの取得に失敗しました')
      }
    } catch (error) {
      console.error('カテゴリの取得中にエラーが発生しました:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        fetchCategories()
        closeModal()
        // 成功ポップアップ表示
        alert('✅ カテゴリが正常に保存されました！\n\n設定内容がシステムに反映されます。')
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'エラーが発生しました')
      }
    } catch (error) {
      console.error('カテゴリの保存中にエラーが発生しました:', error)
      alert('エラーが発生しました')
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || '',
      categoryType: category.categoryType || 'PHYSICAL',
      sortOrder: category.sortOrder,
      isActive: category.isActive
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`「${category.name}」を削除しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchCategories()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'エラーが発生しました')
      }
    } catch (error) {
      console.error('カテゴリの削除中にエラーが発生しました:', error)
      alert('エラーが発生しました')
    }
  }

  const openModal = () => {
    setEditingCategory(null)
    setFormData({
      name: '',
      description: '',
      categoryType: 'PHYSICAL',
      sortOrder: 0,
      isActive: true
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const canManage = session?.user?.role && hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">商品カテゴリ管理</h1>
        {canManage && (
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            新しいカテゴリを追加
          </button>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  カテゴリ名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  説明
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  種別
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                  並び順
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                  商品数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                  送料設定
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                  状態
                </th>
                {canManage && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                    操作
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {category.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    category.categoryType === 'COURSE' 
                      ? 'bg-purple-100 text-purple-800'
                      : category.categoryType === 'DIGITAL' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {category.categoryType === 'COURSE' 
                      ? 'コース商品' 
                      : category.categoryType === 'DIGITAL' 
                      ? 'デジタル商品' 
                      : '現物商品'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category.sortOrder}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category._count.products}件
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category.shippingRate ? (
                    <div>
                      <div>送料: ¥{category.shippingRate.shippingFee.toLocaleString()}</div>
                      {category.shippingRate.freeShippingThreshold && (
                        <div className="text-xs text-gray-400">
                          ¥{category.shippingRate.freeShippingThreshold.toLocaleString()}以上で送料無料
                        </div>
                      )}
                    </div>
                  ) : (
                    '未設定'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    category.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {category.isActive ? '有効' : '無効'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="text-red-600 hover:text-red-900"
                    >
                      削除
                    </button>
                  </td>
                )}
              </tr>
            ))}
            </tbody>
          </table>
        </div>

        {categories.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            カテゴリが見つかりません
          </div>
        )}
      </div>

      {/* モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'カテゴリを編集' : '新しいカテゴリを追加'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリ名 *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    説明
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="categoryType" className="block text-sm font-medium text-gray-700 mb-2">
                    カテゴリ種別 *
                  </label>
                  <select
                    id="categoryType"
                    value={formData.categoryType}
                    onChange={(e) => setFormData({ ...formData, categoryType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="PHYSICAL">現物商品（送料設定あり）</option>
                    <option value="DIGITAL">デジタル商品（送料なし・即座完了）</option>
                    <option value="COURSE">🎓 コース商品（コース自動登録）</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    現物商品：送料が適用され、通常の出荷プロセス｜デジタル商品：送料無料で購入後即座に完了｜コース商品：購入時に指定コースへ自動登録
                  </p>
                </div>
                <div className="mb-4">
                  <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-2">
                    並び順
                  </label>
                  <input
                    type="number"
                    id="sortOrder"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">有効にする</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    {editingCategory ? '更新' : '作成'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}