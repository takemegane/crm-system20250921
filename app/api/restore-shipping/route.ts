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
    console.log('🚚 Shipping rates restoration API called')
    
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

    // 現在の送料設定数を確認
    const existingRates = await prisma.shippingRate.findMany()
    console.log('📊 Existing shipping rates count:', existingRates.length)

    if (existingRates.length > 0) {
      console.log('ℹ️ Shipping rates already exist, skipping restoration')
      return NextResponse.json({
        message: '送料設定は既に存在します',
        shippingRates: existingRates,
        restored: false
      })
    }

    console.log('🔄 Creating default shipping rates...')

    // デフォルト送料設定を作成
    const defaultShippingRate = await prisma.shippingRate.create({
      data: {
        categoryId: null, // デフォルト送料（カテゴリなし）
        shippingFee: 500,
        freeShippingThreshold: 10000,
        isActive: true
      }
    })
    console.log('✅ Created default shipping rate:', defaultShippingRate.shippingFee)

    // カテゴリ別送料設定
    const categories = await prisma.category.findMany({
      where: { categoryType: 'PHYSICAL' } // 現物商品のカテゴリのみ
    })
    console.log('📋 Physical categories for shipping:', categories.length)

    const createdRates = [defaultShippingRate]

    // 書籍・教材カテゴリの送料設定
    const bookCategory = categories.find(c => c.name === '書籍・教材')
    if (bookCategory) {
      const bookShippingRate = await prisma.shippingRate.create({
        data: {
          categoryId: bookCategory.id,
          shippingFee: 300,
          freeShippingThreshold: 5000,
          isActive: true
        }
      })
      console.log('✅ Created shipping rate for 書籍・教材:', bookShippingRate.shippingFee)
      createdRates.push(bookShippingRate)
    }

    // 学習用品カテゴリの送料設定
    const suppliesCategory = categories.find(c => c.name === '学習用品')
    if (suppliesCategory) {
      const suppliesShippingRate = await prisma.shippingRate.create({
        data: {
          categoryId: suppliesCategory.id,
          shippingFee: 800,
          freeShippingThreshold: 8000,
          isActive: true
        }
      })
      console.log('✅ Created shipping rate for 学習用品:', suppliesShippingRate.shippingFee)
      createdRates.push(suppliesShippingRate)
    }

    console.log('🎉 Shipping rates restoration completed')
    return NextResponse.json({
      message: '送料設定が正常に復元されました',
      shippingRates: createdRates,
      restored: true,
      count: createdRates.length
    })

  } catch (error) {
    console.error('❌ Error restoring shipping rates:', error)
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

export async function GET() {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const shippingRates = await prisma.shippingRate.findMany({
      include: {
        category: true
      }
    })

    return NextResponse.json({
      shippingRates,
      count: shippingRates.length
    })
  } catch (error) {
    console.error('Error fetching shipping rates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}