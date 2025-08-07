'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  isActive: boolean
  enablePayment: boolean
  stripeProductId?: string
  stripePriceId?: string
  courseMapping?: {
    courseId: string
    courseName: string
    autoEnroll: boolean
    description: string
  }
}

type Course = {
  id: string
  name: string
  description: string
  price: number
  duration: number
}

type Category = {
  id: string
  name: string
  categoryType: string
  isActive: boolean
}

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    categoryId: '',
    imageUrl: '',
    sortOrder: '0',
    isActive: true,
    // コース自動登録設定
    enableCourseMapping: false,
    courseId: '',
    autoEnroll: true,
    // 決済設定
    enablePayment: false,
    stripeProductId: '',
    stripePriceId: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [courses, setCourses] = useState<Course[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories')
        if (response.ok) {
          const data = await response.json()
          setCategories(data.categories || [])
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }

    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/courses/list')
        if (response.ok) {
          const data = await response.json()
          setCourses(data.courses || [])
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
      }
    }

    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${params.id}`)
        
        if (!response.ok) {
          throw new Error('商品が見つかりません')
        }
        
        const data = await response.json()
        setProduct(data)
        setFormData({
          name: data.name,
          description: data.description || '',
          price: data.price.toString(),
          stock: data.stock.toString(),
          categoryId: data.categoryId || '',
          imageUrl: data.imageUrl || '',
          sortOrder: data.sortOrder?.toString() || '0',
          isActive: data.isActive,
          // コース自動登録設定
          enableCourseMapping: !!data.courseMapping,
          courseId: data.courseMapping?.courseId || '',
          autoEnroll: data.courseMapping?.autoEnroll ?? true,
          // 決済設定
          enablePayment: data.enablePayment || false,
          stripeProductId: data.stripeProductId || '',
          stripePriceId: data.stripePriceId || ''
        })
      } catch (error) {
        console.error('Error fetching product:', error)
        setError(error instanceof Error ? error.message : '商品の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
    fetchCourses()
    fetchProduct()
  }, [params.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      // コース自動登録設定の準備
      let courseMapping = null
      if (formData.enableCourseMapping && formData.courseId) {
        const selectedCourse = courses.find(course => course.id === formData.courseId)
        if (selectedCourse) {
          courseMapping = {
            courseId: formData.courseId,
            courseName: selectedCourse.name,
            autoEnroll: formData.autoEnroll,
            description: `購入時に${selectedCourse.name}へ自動登録`
          }
        }
      }

      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price || '0'),
          stock: parseInt(formData.stock || '0'),
          categoryId: formData.categoryId || null,
          imageUrl: formData.imageUrl || null,
          sortOrder: parseInt(formData.sortOrder || '0'),
          isActive: formData.isActive,
          courseMapping: courseMapping,
          enablePayment: formData.enablePayment,
          stripeProductId: formData.stripeProductId || null,
          stripePriceId: formData.stripePriceId || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '商品の更新に失敗しました')
      }

      router.push('/dashboard/products')
    } catch (error) {
      console.error('Error updating product:', error)
      setError(error instanceof Error ? error.message : '商品の更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => {
      const newFormData = {
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }
      
      // カテゴリが変更された場合、COURSE型かどうかチェック
      if (name === 'categoryId') {
        const selectedCategory = categories.find(cat => cat.id === value)
        if (selectedCategory?.categoryType === 'COURSE') {
          // COURSE型カテゴリが選択された場合、コース設定を有効に
          newFormData.enableCourseMapping = true
        } else {
          // COURSE型以外が選択された場合、コース設定を無効に
          newFormData.enableCourseMapping = false
          newFormData.courseId = ''
        }
      }
      
      return newFormData
    })
  }

  // 選択されたカテゴリがCOURSE型かどうか判定
  const selectedCategory = categories.find(cat => cat.id === formData.categoryId)
  const isCourseCategory = selectedCategory?.categoryType === 'COURSE'

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'アップロードに失敗しました')
      }

      const result = await response.json()
      setFormData(prev => ({
        ...prev,
        imageUrl: result.url
      }))
    } catch (error) {
      console.error('Error uploading file:', error)
      setError(error instanceof Error ? error.message : 'アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">読み込み中...</div>
      </div>
    )
  }

  if (error && !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/products">
            <Button variant="outline">← 商品一覧に戻る</Button>
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/products">
          <Button variant="outline">← 商品一覧に戻る</Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">商品編集</h1>
          <p className="mt-2 text-gray-600">
            商品情報を編集できます
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                商品名 *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="商品名を入力してください"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                カテゴリ
              </label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">カテゴリを選択してください</option>
                {categories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                価格 (円) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
            </div>

            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                在庫数
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
            </div>

            <div>
              <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700">
                並び順
              </label>
              <input
                type="number"
                id="sortOrder"
                name="sortOrder"
                value={formData.sortOrder}
                onChange={handleChange}
                min="0"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                小さい値ほど先に表示されます（0が最優先）
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              商品説明
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              placeholder="商品の説明を入力してください"
            />
          </div>

          <div>
            <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700">
              商品画像
            </label>
            <div className="mt-1">
              <input
                type="file"
                id="imageFile"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                対応形式: JPEG, PNG, GIF, WebP（最大5MB）
              </p>
            </div>
            {uploading && (
              <div className="mt-2 text-sm text-blue-600">
                アップロード中...
              </div>
            )}
            {formData.imageUrl && (
              <div className="mt-3">
                <img
                  src={formData.imageUrl}
                  alt="プレビュー"
                  className="h-32 w-32 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  画像を削除
                </button>
              </div>
            )}
          </div>

          {/* コース自動登録設定 */}
          {isCourseCategory && (
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  🎓 コース自動登録設定
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  この商品を購入した顧客に自動的にコースを登録する設定を行えます
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="enableCourseMapping"
                    name="enableCourseMapping"
                    checked={formData.enableCourseMapping}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableCourseMapping" className="ml-2 block text-sm text-gray-900">
                    この商品購入時にコースを自動登録する
                  </label>
                </div>

                {formData.enableCourseMapping && (
                  <div className="ml-6 space-y-4 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <label htmlFor="courseId" className="block text-sm font-medium text-gray-700">
                        対象コース *
                      </label>
                      <select
                        id="courseId"
                        name="courseId"
                        value={formData.courseId}
                        onChange={handleChange}
                        required={formData.enableCourseMapping}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">コースを選択してください</option>
                        {courses.map((course) => (
                          <option key={course.id} value={course.id}>
                            {course.name} (¥{course.price.toLocaleString()} - {course.duration}日間)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="autoEnroll"
                        name="autoEnroll"
                        checked={formData.autoEnroll}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="autoEnroll" className="ml-2 block text-sm text-gray-900">
                        購入と同時に自動登録する
                      </label>
                    </div>

                    {formData.courseId && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800">
                          <span className="font-medium">設定内容:</span>
                          {(() => {
                            const selectedCourse = courses.find(c => c.id === formData.courseId)
                            return selectedCourse ? (
                              <>
                                <br />
                                商品購入後、顧客を「{selectedCourse.name}」に
                                {formData.autoEnroll ? '自動登録' : '手動登録待ち'}します。
                              </>
                            ) : null
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              販売中にする
            </label>
          </div>

          {/* 決済設定セクション */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">オンライン決済設定</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enablePayment"
                  name="enablePayment"
                  checked={formData.enablePayment}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="enablePayment" className="ml-2 block text-sm text-gray-700">
                  オンライン決済を有効にする
                </label>
              </div>

              {formData.enablePayment && (
                <div className="ml-6 space-y-4 p-4 bg-blue-50 rounded-md">
                  <div>
                    <label htmlFor="stripeProductId" className="block text-sm font-medium text-gray-700">
                      Stripe商品ID（オプション）
                    </label>
                    <input
                      type="text"
                      id="stripeProductId"
                      name="stripeProductId"
                      value={formData.stripeProductId}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="prod_..."
                      readOnly={!formData.enablePayment}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Stripeダッシュボードで作成された商品IDを入力（空欄の場合は自動作成）
                    </p>
                  </div>

                  <div>
                    <label htmlFor="stripePriceId" className="block text-sm font-medium text-gray-700">
                      Stripe価格ID（オプション）
                    </label>
                    <input
                      type="text"
                      id="stripePriceId"
                      name="stripePriceId"
                      value={formData.stripePriceId}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="price_..."
                      readOnly={!formData.enablePayment}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Stripeの価格IDを入力（空欄の場合は自動作成）
                    </p>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex">
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-yellow-800">
                          Stripe設定が必要です
                        </h4>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>オンライン決済を利用するには、事前にStripe設定を完了してください。</p>
                          <a 
                            href="/dashboard/payment-settings" 
                            target="_blank"
                            className="font-medium underline hover:text-yellow-900"
                          >
                            決済設定へ →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Link href="/dashboard/products">
              <Button variant="outline" type="button">キャンセル</Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? '更新中...' : '商品を更新'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}