import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Restore all data API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    const session = await getServerSession(authOptions)
    console.log('👤 Session user:', session?.user?.email || 'No session', 'role:', session?.user?.role)
    
    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')) {
      console.log('❌ Permission denied for user:', session?.user?.email, 'role:', session?.user?.role)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    console.log('✅ Permission check passed')

    const results = {
      categories: [],
      products: [],
      shippingRates: [],
      errors: []
    }

    // 1. カテゴリ復元
    try {
      console.log('📂 Step 1: Restoring categories...')
      const existingCategories = await prisma.category.findMany()
      
      if (existingCategories.length === 0) {
        const defaultCategories = [
          {
            name: '書籍・教材',
            description: '参考書、テキスト、学習用教材など',
            categoryType: 'PHYSICAL',
            sortOrder: 1,
            isActive: true
          },
          {
            name: 'デジタルコンテンツ',
            description: 'オンライン教材、動画講座、PDFファイルなど',
            categoryType: 'DIGITAL',
            sortOrder: 2,
            isActive: true
          },
          {
            name: '学習用品',
            description: '文房具、ノート、計算機などの学習用具',
            categoryType: 'PHYSICAL',
            sortOrder: 3,
            isActive: true
          },
          {
            name: '認定証・修了証',
            description: 'コース修了証明書、認定証などの発行物',
            categoryType: 'PHYSICAL',
            sortOrder: 4,
            isActive: true
          },
          {
            name: 'その他',
            description: 'その他の商品・サービス',
            categoryType: 'PHYSICAL',
            sortOrder: 5,
            isActive: true
          }
        ]

        for (const categoryData of defaultCategories) {
          const category = await prisma.category.create({ data: categoryData })
          results.categories.push(category)
          console.log('✅ Created category:', category.name, '(' + category.categoryType + ')')
        }
      } else {
        results.categories = existingCategories
        console.log('ℹ️ Categories already exist:', existingCategories.length)
      }
    } catch (error) {
      console.error('❌ Error creating categories:', error)
      results.errors.push('Categories: ' + String(error))
    }

    // 2. 商品復元
    try {
      console.log('🛍️ Step 2: Restoring products...')
      const existingProducts = await prisma.product.findMany()
      
      if (existingProducts.length === 0 && results.categories.length > 0) {
        const physicalCategory = results.categories.find(c => c.categoryType === 'PHYSICAL')
        const digitalCategory = results.categories.find(c => c.categoryType === 'DIGITAL')

        const defaultProducts = [
          {
            name: 'プログラミング入門書',
            description: 'JavaScript入門から応用まで学べる参考書',
            price: 2980,
            stock: 50,
            categoryId: physicalCategory?.id || results.categories[0]?.id,
            sortOrder: 1,
            isActive: true
          },
          {
            name: 'オンライン動画講座（基礎編）',
            description: '初心者向けプログラミング動画講座・ダウンロード版',
            price: 4980,
            stock: 999,
            categoryId: digitalCategory?.id || results.categories[0]?.id,
            sortOrder: 2,
            isActive: true
          },
          {
            name: 'プログラミングノートセット',
            description: '学習用ノート3冊セット・ペン付き',
            price: 1200,
            stock: 30,
            categoryId: physicalCategory?.id || results.categories[0]?.id,
            sortOrder: 3,
            isActive: true
          },
          {
            name: 'Webデザイン完全ガイド（PDF版）',
            description: 'デザインの基礎から実践までのデジタル教材',
            price: 3500,
            stock: 999,
            categoryId: digitalCategory?.id || results.categories[0]?.id,
            sortOrder: 4,
            isActive: true
          },
          {
            name: 'プログラミング電卓',
            description: '16進数計算対応の高機能電卓',
            price: 5800,
            stock: 20,
            categoryId: physicalCategory?.id || results.categories[0]?.id,
            sortOrder: 5,
            isActive: true
          }
        ]

        for (const productData of defaultProducts) {
          const product = await prisma.product.create({
            data: productData,
            include: { category: true }
          })
          results.products.push(product)
          console.log('✅ Created product:', product.name, 'Category:', product.category?.name)
        }
      } else {
        results.products = existingProducts
        console.log('ℹ️ Products already exist:', existingProducts.length)
      }
    } catch (error) {
      console.error('❌ Error creating products:', error)
      results.errors.push('Products: ' + String(error))
    }

    // 3. 送料設定復元
    try {
      console.log('🚚 Step 3: Restoring shipping rates...')
      const existingRates = await prisma.shippingRate.findMany()
      
      if (existingRates.length === 0) {
        // デフォルト送料
        const defaultRate = await prisma.shippingRate.create({
          data: {
            categoryId: null,
            shippingFee: 500,
            freeShippingThreshold: 10000,
            isActive: true
          }
        })
        results.shippingRates.push(defaultRate)
        console.log('✅ Created default shipping rate: ¥500')

        // カテゴリ別送料設定
        const bookCategory = results.categories.find(c => c.name === '書籍・教材')
        if (bookCategory) {
          const bookRate = await prisma.shippingRate.create({
            data: {
              categoryId: bookCategory.id,
              shippingFee: 300,
              freeShippingThreshold: 5000,
              isActive: true
            }
          })
          results.shippingRates.push(bookRate)
          console.log('✅ Created book shipping rate: ¥300')
        }

        const suppliesCategory = results.categories.find(c => c.name === '学習用品')
        if (suppliesCategory) {
          const suppliesRate = await prisma.shippingRate.create({
            data: {
              categoryId: suppliesCategory.id,
              shippingFee: 800,
              freeShippingThreshold: 8000,
              isActive: true
            }
          })
          results.shippingRates.push(suppliesRate)
          console.log('✅ Created supplies shipping rate: ¥800')
        }
      } else {
        results.shippingRates = existingRates
        console.log('ℹ️ Shipping rates already exist:', existingRates.length)
      }
    } catch (error) {
      console.error('❌ Error creating shipping rates:', error)
      results.errors.push('Shipping rates: ' + String(error))
    }

    console.log('🎉 All data restoration completed')
    return NextResponse.json({
      message: '全データが正常に復元されました',
      restored: true,
      summary: {
        categories: results.categories.length,
        products: results.products.length,
        shippingRates: results.shippingRates.length,
        errors: results.errors.length
      },
      details: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in restore all data:', error)
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}