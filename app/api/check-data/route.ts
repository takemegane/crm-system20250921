import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('📊 Data check API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    // データ件数確認
    const [categories, products, shippingRates, users] = await Promise.all([
      prisma.category.findMany({ 
        select: { 
          id: true, 
          name: true, 
          categoryType: true, 
          isActive: true 
        } 
      }),
      prisma.product.findMany({ 
        select: { 
          id: true, 
          name: true, 
          price: true, 
          stock: true,
          isActive: true,
          category: {
            select: {
              name: true,
              categoryType: true
            }
          }
        } 
      }),
      prisma.shippingRate.findMany({ 
        select: { 
          id: true, 
          shippingFee: true, 
          freeShippingThreshold: true,
          categoryId: true,
          isActive: true,
          category: {
            select: {
              name: true
            }
          }
        } 
      }),
      prisma.user.count()
    ])

    console.log('✅ Data counts retrieved')

    const summary = {
      categories: categories.length,
      products: products.length,
      shippingRates: shippingRates.length,
      users: users,
      timestamp: new Date().toISOString()
    }

    const details = {
      categories: categories.map(c => ({
        name: c.name,
        type: c.categoryType,
        active: c.isActive
      })),
      products: products.map(p => ({
        name: p.name,
        price: p.price,
        stock: p.stock,
        active: p.isActive,
        category: p.category?.name,
        categoryType: p.category?.categoryType
      })),
      shippingRates: shippingRates.map(r => ({
        fee: r.shippingFee,
        threshold: r.freeShippingThreshold,
        category: r.category?.name || 'デフォルト',
        active: r.isActive
      }))
    }

    return NextResponse.json({
      success: true,
      summary,
      details,
      categoryTypeSystemActive: categories.some(c => c.categoryType === 'DIGITAL'),
      message: `データ確認完了: カテゴリ${summary.categories}件、商品${summary.products}件、送料設定${summary.shippingRates}件`
    })

  } catch (error) {
    console.error('❌ Error checking data:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}