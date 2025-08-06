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
    console.log('🔄 Category restoration API called')
    
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

    // 現在のカテゴリ数を確認
    const existingCategories = await prisma.category.findMany()
    console.log('📊 Existing categories count:', existingCategories.length)

    if (existingCategories.length > 0) {
      console.log('ℹ️ Categories already exist, skipping restoration')
      return NextResponse.json({
        message: 'カテゴリは既に存在します',
        categories: existingCategories,
        restored: false
      })
    }

    // デフォルトカテゴリデータ（categoryType含む）
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

    console.log('🔄 Creating default categories...')
    const createdCategories = []

    for (const categoryData of defaultCategories) {
      try {
        const category = await prisma.category.create({
          data: categoryData
        })
        console.log('✅ Created category:', category.name)
        createdCategories.push(category)
      } catch (error) {
        console.error('❌ Failed to create category:', categoryData.name, error)
      }
    }

    console.log('🎉 Category restoration completed')
    return NextResponse.json({
      message: 'カテゴリが正常に復元されました',
      categories: createdCategories,
      restored: true,
      count: createdCategories.length
    })

  } catch (error) {
    console.error('❌ Error restoring categories:', error)
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

    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({
      categories,
      count: categories.length
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}