import { getPrismaClient } from '@/lib/db'

export interface CartItem {
  productId: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    categoryId: string | null
  }
}

export interface ProductWithCategory {
  id: string
  name: string
  price: number
  categoryId: string | null
  category?: {
    id: string
    name: string
    shippingRate?: {
      id: string
      shippingFee: number
      isActive: boolean
    } | null
  } | null
}

/**
 * 送料計算ロジック統一関数
 * カテゴリごとに独立して送料を計算し、各カテゴリの閾値で無料判定
 */
export async function calculateShipping(cartItems: CartItem[]): Promise<{
  shippingFee: number
  subtotalAmount: number
  totalAmount: number
  calculation: {
    productShippingDetails: Array<{
      productId: string
      productName: string
      quantity: number
      shippingFeePerItem: number
      totalShippingFee: number
      categoryFree: boolean
    }>
    freeShippingApplied: boolean
    freeShippingThreshold: number | null
    isOverFreeShippingThreshold?: boolean
  }
}> {
  const prisma = getPrismaClient()
  if (!prisma) {
    throw new Error('Prisma client not initialized')
  }

  // 商品小計計算
  const subtotalAmount = cartItems.reduce((sum, item) => {
    return sum + (item.product.price * item.quantity)
  }, 0)

  // カートの商品とそのカテゴリを取得
  const productIds = cartItems.map(item => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      category: {
        include: {
          shippingRate: true
        }
      }
    }
  })

  // カテゴリ別小計を計算
  const categorySubtotals = new Map<string, number>()
  
  for (const cartItem of cartItems) {
    const product = products.find(p => p.id === cartItem.productId)
    if (!product) continue
    
    const categoryId = product.categoryId || 'default'
    const itemSubtotal = product.price * cartItem.quantity
    
    categorySubtotals.set(categoryId, (categorySubtotals.get(categoryId) || 0) + itemSubtotal)
  }

  // デフォルト送料設定を取得
  const defaultShippingRate = await prisma.shippingRate.findFirst({
    where: { categoryId: null }
  })

  // カテゴリ別送料システム: 全体合計での送料無料ルールは適用しない
  
  // カテゴリベース送料計算: 各カテゴリで1回のみ送料を適用
  const categoryShippingFees = new Map<string, number>()
  const categoryFreeFlags = new Map<string, boolean>()
  
  // 各カテゴリの送料を計算
  for (const [categoryId, categorySubtotal] of Array.from(categorySubtotals.entries())) {
    let shippingRate = null
    let isCategoryFree = false
    
    // カテゴリの送料設定を取得
    if (categoryId !== 'default') {
      const categoryProduct = products.find(p => (p.categoryId || 'default') === categoryId)
      if (categoryProduct?.category?.shippingRate && categoryProduct.category.shippingRate.isActive) {
        shippingRate = categoryProduct.category.shippingRate
        // カテゴリの無料閾値をチェック
        if (shippingRate.freeShippingThreshold && categorySubtotal >= shippingRate.freeShippingThreshold) {
          isCategoryFree = true
        }
      }
    }
    
    // デフォルト送料を適用
    if (!shippingRate && defaultShippingRate) {
      shippingRate = defaultShippingRate
      // デフォルト送料の無料閾値をチェック
      if (shippingRate.freeShippingThreshold && categorySubtotal >= shippingRate.freeShippingThreshold) {
        isCategoryFree = true
      }
    }

    // カテゴリ別送料無料ルール適用（カテゴリごとの個別判定）
    const isFree = isCategoryFree
    const categoryShippingFee = isFree ? 0 : (shippingRate?.shippingFee ?? 500)
    
    categoryShippingFees.set(categoryId, categoryShippingFee)
    categoryFreeFlags.set(categoryId, isFree)
  }

  // 全カテゴリの送料合計
  let shippingFee = 0
  for (const fee of Array.from(categoryShippingFees.values())) {
    shippingFee += fee
  }

  // 商品詳細情報を作成（表示用）
  const productShippingDetails: Array<{
    productId: string
    productName: string
    quantity: number
    shippingFeePerItem: number
    totalShippingFee: number
    categoryFree: boolean
  }> = []

  for (const cartItem of cartItems) {
    const product = products.find(p => p.id === cartItem.productId)
    if (!product) continue

    const categoryId = product.categoryId || 'default'
    const categoryShippingFee = categoryShippingFees.get(categoryId) || 0
    const isFree = categoryFreeFlags.get(categoryId) || false

    productShippingDetails.push({
      productId: product.id,
      productName: product.name,
      quantity: cartItem.quantity,
      shippingFeePerItem: 0, // カテゴリベースなので商品単位は0
      totalShippingFee: 0,   // カテゴリベースなので商品単位は0
      categoryFree: isFree
    })
  }

  const totalAmount = subtotalAmount + shippingFee

  return {
    shippingFee,
    subtotalAmount,
    totalAmount,
    calculation: {
      productShippingDetails,
      freeShippingApplied: shippingFee === 0,
      freeShippingThreshold: null, // カテゴリ別送料システムでは全体閾値なし
      isOverFreeShippingThreshold: false // カテゴリ別送料システムでは全体判定なし
    }
  }
}