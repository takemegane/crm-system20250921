'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission, UserRole } from '@/lib/permissions'

interface Category {
  id: string
  name: string
}

interface ShippingRate {
  id: string
  categoryId: string | null
  shippingFee: number
  freeShippingThreshold: number | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  category: Category | null
}

export default function ShippingRatesPage() {
  const { data: session } = useSession()
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [defaultRate, setDefaultRate] = useState<ShippingRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null)
  const [formData, setFormData] = useState({
    categoryId: '',
    shippingFee: 0,
    freeShippingThreshold: null as number | null,
    isActive: true
  })
  const [defaultFormData, setDefaultFormData] = useState({
    shippingFee: 0,
    freeShippingThreshold: null as number | null,
    isActive: true
  })

  useEffect(() => {
    fetchShippingRates()
    fetchCategories()
  }, [])

  const fetchShippingRates = async () => {
    try {
      const response = await fetch('/api/shipping-rates')
      if (response.ok) {
        const data = await response.json()
        const rates = data.shippingRates || []
        
        // デフォルト送料設定を分離
        const defaultShippingRate = rates.find((rate: ShippingRate) => rate.categoryId === null)
        const categoryRates = rates.filter((rate: ShippingRate) => rate.categoryId !== null)
        
        setDefaultRate(defaultShippingRate || null)
        setShippingRates(categoryRates)
        
        // デフォルト設定があれば初期値に設定
        if (defaultShippingRate) {
          setDefaultFormData({
            shippingFee: defaultShippingRate.shippingFee,
            freeShippingThreshold: defaultShippingRate.freeShippingThreshold,
            isActive: defaultShippingRate.isActive
          })
        }
      } else {
        console.error('送料設定の取得に失敗しました')
      }
    } catch (error) {
      console.error('送料設定の取得中にエラーが発生しました:', error)
    } finally {
      setLoading(false)
    }
  }

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
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingRate ? `/api/shipping-rates/${editingRate.id}` : '/api/shipping-rates'
      const method = editingRate ? 'PUT' : 'POST'
      
      const requestData = {
        categoryId: formData.categoryId || null,
        shippingFee: formData.shippingFee,
        freeShippingThreshold: formData.freeShippingThreshold,
        isActive: formData.isActive
      }
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })
      
      if (response.ok) {
        fetchShippingRates()
        closeModal()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'エラーが発生しました')
      }
    } catch (error) {
      console.error('送料設定の保存中にエラーが発生しました:', error)
      alert('エラーが発生しました')
    }
  }

  const handleEdit = (rate: ShippingRate) => {
    setEditingRate(rate)
    setFormData({
      categoryId: rate.categoryId || '',
      shippingFee: rate.shippingFee,
      freeShippingThreshold: rate.freeShippingThreshold,
      isActive: rate.isActive
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (rate: ShippingRate) => {
    const rateName = rate.category ? rate.category.name : 'デフォルト送料'
    if (!window.confirm(`「${rateName}」の送料設定を削除しますか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/shipping-rates/${rate.id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchShippingRates()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'エラーが発生しました')
      }
    } catch (error) {
      console.error('送料設定の削除中にエラーが発生しました:', error)
      alert('エラーが発生しました')
    }
  }

  const openModal = () => {
    setEditingRate(null)
    setFormData({
      categoryId: '',
      shippingFee: 0,
      freeShippingThreshold: null,
      isActive: true
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRate(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const canManage = session?.user?.role && hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')

  // 既に設定済みのカテゴリIDを取得
  const usedCategoryIds = shippingRates.map(rate => rate.categoryId).filter(Boolean)
  const hasDefaultRate = !!defaultRate

  // 利用可能なカテゴリ（編集時は現在のカテゴリも含める）
  const availableCategories = categories.filter(category => 
    !usedCategoryIds.includes(category.id) || 
    (editingRate && editingRate.categoryId === category.id)
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">送料設定管理</h1>
        {canManage && (
          <button
            onClick={openModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            新しい送料設定を追加
          </button>
        )}
      </div>

      {/* デフォルト送料設定セクション */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">デフォルト送料設定</h2>
        {defaultRate ? (
          <div className="border rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">送料</label>
                <p className="text-lg font-semibold text-gray-900">¥{defaultRate.shippingFee.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">送料無料の閾値</label>
                <p className="text-lg font-semibold text-gray-900">
                  {defaultRate.freeShippingThreshold 
                    ? `¥${defaultRate.freeShippingThreshold.toLocaleString()}以上` 
                    : '設定なし'
                  }
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">状態</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  defaultRate.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {defaultRate.isActive ? '有効' : '無効'}
                </span>
              </div>
            </div>
            {canManage && (
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => handleEdit(defaultRate)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg mr-2"
                >
                  デフォルト送料を編集
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <p className="text-gray-500 mb-4">デフォルト送料が設定されていません</p>
            {canManage && (
              <button
                onClick={() => {
                  setEditingRate(null)
                  setFormData({
                    categoryId: '',
                    shippingFee: 0,
                    freeShippingThreshold: null,
                    isActive: true
                  })
                  setIsModalOpen(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                デフォルト送料を設定
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" style={{ minWidth: '800px' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                対象カテゴリ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                送料
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[150px]">
                送料無料の閾値
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                作成日
              </th>
              {canManage && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                  操作
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {shippingRates.map((rate) => (
              <tr key={rate.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 min-w-[150px]">
                  {rate.category ? rate.category.name : 'デフォルト送料'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 min-w-[100px]">
                  ¥{rate.shippingFee.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 min-w-[150px]">
                  {rate.freeShippingThreshold 
                    ? `¥${rate.freeShippingThreshold.toLocaleString()}以上` 
                    : '設定なし'
                  }
                </td>
                <td className="px-6 py-4 whitespace-nowrap min-w-[80px]">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    rate.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {rate.isActive ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 min-w-[120px]">
                  {new Date(rate.createdAt).toLocaleDateString('ja-JP')}
                </td>
                {canManage && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium min-w-[120px]">
                    <button
                      onClick={() => handleEdit(rate)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(rate)}
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

          {shippingRates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              送料設定が見つかりません
            </div>
          )}
        </div>
      </div>

      {/* モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingRate ? '送料設定を編集' : '新しい送料設定を追加'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                    対象カテゴリ
                  </label>
                  <select
                    id="categoryId"
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">デフォルト送料設定</option>
                    {availableCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="shippingFee" className="block text-sm font-medium text-gray-700 mb-2">
                    送料 (円) *
                  </label>
                  <input
                    type="number"
                    id="shippingFee"
                    min="0"
                    step="1"
                    value={formData.shippingFee}
                    onChange={(e) => setFormData({ ...formData, shippingFee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="freeShippingThreshold" className="block text-sm font-medium text-gray-700 mb-2">
                    送料無料の閾値 (円)
                  </label>
                  <input
                    type="number"
                    id="freeShippingThreshold"
                    min="0"
                    step="1"
                    value={formData.freeShippingThreshold || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      freeShippingThreshold: e.target.value ? parseFloat(e.target.value) : null 
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="設定しない場合は空白"
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
                    {editingRate ? '更新' : '作成'}
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