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
    console.log('🛍️ Product restoration API called')
    
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

    // 現在の商品数を確認
    const existingProducts = await prisma.product.findMany()
    console.log('📊 Existing products count:', existingProducts.length)

    if (existingProducts.length > 0) {
      console.log('ℹ️ Products already exist, skipping restoration')
      return NextResponse.json({
        message: '商品は既に存在します',
        products: existingProducts,
        restored: false
      })
    }

    // カテゴリを取得
    const categories = await prisma.category.findMany()
    console.log('📋 Available categories:', categories.length)

    if (categories.length === 0) {
      return NextResponse.json({
        error: 'カテゴリが存在しません。先にカテゴリを復元してください。'
      }, { status: 400 })
    }

    // カテゴリIDを取得
    const physicalCategory = categories.find(c => c.categoryType === 'PHYSICAL')
    const digitalCategory = categories.find(c => c.categoryType === 'DIGITAL')

    // デフォルト商品データ
    const defaultProducts = [
      {
        name: 'プログラミング入門書',
        description: 'JavaScript入門から応用まで学べる参考書',
        price: 2980,
        stock: 50,
        categoryId: physicalCategory?.id || categories[0]?.id,
        sortOrder: 1,
        isActive: true
      },
      {
        name: 'オンライン動画講座（基礎編）',
        description: '初心者向けプログラミング動画講座・ダウンロード版',
        price: 4980,
        stock: 999,
        categoryId: digitalCategory?.id || categories[0]?.id,
        sortOrder: 2,
        isActive: true
      },
      {
        name: 'プログラミングノートセット',
        description: '学習用ノート3冊セット・ペン付き',
        price: 1200,
        stock: 30,
        categoryId: physicalCategory?.id || categories[0]?.id,
        sortOrder: 3,
        isActive: true
      },
      {
        name: 'Webデザイン完全ガイド（PDF版）',
        description: 'デザインの基礎から実践までのデジタル教材',
        price: 3500,
        stock: 999,
        categoryId: digitalCategory?.id || categories[0]?.id,
        sortOrder: 4,
        isActive: true
      },
      {
        name: 'プログラミング電卓',
        description: '16進数計算対応の高機能電卓',
        price: 5800,
        stock: 20,
        categoryId: physicalCategory?.id || categories[0]?.id,
        sortOrder: 5,
        isActive: true
      },
      {
        name: 'コース修了証明書',
        description: '各種コース修了時に発行される証明書',
        price: 500,
        stock: 100,
        categoryId: physicalCategory?.id || categories[0]?.id,
        sortOrder: 6,
        isActive: true
      }
    ]

    console.log('🔄 Creating default products...')
    const createdProducts = []

    for (const productData of defaultProducts) {
      try {
        const product = await prisma.product.create({
          data: productData,
          include: {
            category: true
          }
        })
        console.log('✅ Created product:', product.name, 'Category:', product.category?.name)
        createdProducts.push(product)
      } catch (error) {
        console.error('❌ Failed to create product:', productData.name, error)
      }
    }

    console.log('🎉 Product restoration completed')
    return NextResponse.json({
      message: '商品が正常に復元されました',
      products: createdProducts,
      restored: true,
      count: createdProducts.length
    })

  } catch (error) {
    console.error('❌ Error restoring products:', error)
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

    const products = await prisma.product.findMany({
      include: {
        category: true
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({
      products,
      count: products.length
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}