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
    categoryType?: string
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
export async function calculateShipping(
  cartItems: CartItem[], 
  prismaClient?: any
): Promise<{
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
  console.log('💰 calculateShipping called with items:', cartItems.length)
  
  // 外部から渡されたPrismaクライアントを優先使用
  const prisma = prismaClient || getPrismaClient()
  if (!prisma) {
    console.log('❌ Prisma client not available in shipping calculator')
    throw new Error('Prisma client not available')
  }

  console.log('✅ Prisma client ready in shipping calculator')

  // 商品小計計算
  const subtotalAmount = cartItems.reduce((sum, item) => {
    return sum + (item.product.price * item.quantity)
  }, 0)
  
  console.log('💰 Subtotal calculated:', subtotalAmount)

  // カートの商品とそのカテゴリを取得
  const productIds = cartItems.map(item => item.productId)
  console.log('🔍 Fetching products:', productIds)
  
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
  
  console.log('📦 Products fetched:', products.length)
  console.log('📦 Products details:', products.map((p: ProductWithCategory) => ({
    id: p.id,
    name: p.name,
    categoryId: p.categoryId,
    hasCategory: !!p.category,
    categoryType: p.category?.categoryType,
    hasShippingRate: !!p.category?.shippingRate
  })))

  // デジタル商品をフィルタリング（送料計算から除外）
  const physicalProducts = products.filter((p: ProductWithCategory) => 
    !p.category || p.category.categoryType !== 'DIGITAL'
  )
  console.log('📦 Physical products only:', physicalProducts.length, 'out of', products.length)

  // 現物商品のみで小計を再計算（送料計算用）
  const physicalSubtotalAmount = cartItems.reduce((sum, item) => {
    const product = physicalProducts.find((p: ProductWithCategory) => p.id === item.productId)
    if (product) {
      return sum + (item.product.price * item.quantity)
    }
    return sum
  }, 0)
  console.log('💰 Physical products subtotal for shipping:', physicalSubtotalAmount)

  // 現物商品カテゴリ別小計を計算
  const categorySubtotals = new Map<string, number>()
  
  for (const cartItem of cartItems) {
    const product = physicalProducts.find((p: ProductWithCategory) => p.id === cartItem.productId)
    if (!product) continue // デジタル商品は除外
    
    const categoryId = product.categoryId || 'default'
    const itemSubtotal = product.price * cartItem.quantity
    
    categorySubtotals.set(categoryId, (categorySubtotals.get(categoryId) || 0) + itemSubtotal)
  }

  // デフォルト送料設定を取得
  console.log('🔍 Fetching default shipping rate...')
  const defaultShippingRate = await prisma.shippingRate.findFirst({
    where: { categoryId: null }
  })
  
  console.log('💰 Default shipping rate:', defaultShippingRate ? {
    id: defaultShippingRate.id,
    shippingFee: defaultShippingRate.shippingFee,
    freeShippingThreshold: defaultShippingRate.freeShippingThreshold,
    isActive: defaultShippingRate.isActive
  } : 'None found')

  // カテゴリ別送料システム: 全体合計での送料無料ルールは適用しない
  
  // カテゴリベース送料計算: 各カテゴリで1回のみ送料を適用
  const categoryShippingFees = new Map<string, number>()
  const categoryFreeFlags = new Map<string, boolean>()
  
  // 各カテゴリの送料を計算
  for (const [categoryId, categorySubtotal] of Array.from(categorySubtotals.entries())) {
    let shippingRate = null
    let isCategoryFree = false
    
    // カテゴリの送料設定を取得（現物商品のみ）
    if (categoryId !== 'default') {
      const categoryProduct = physicalProducts.find((p: ProductWithCategory) => (p.categoryId || 'default') === categoryId)
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
    const product = products.find((p: ProductWithCategory) => p.id === cartItem.productId)
    if (!product) continue

    // デジタル商品の場合は送料0で追加
    const isDigital = product.category?.categoryType === 'DIGITAL'
    const categoryId = product.categoryId || 'default'
    const categoryShippingFee = isDigital ? 0 : (categoryShippingFees.get(categoryId) || 0)
    const isFree = isDigital ? true : (categoryFreeFlags.get(categoryId) || false)

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