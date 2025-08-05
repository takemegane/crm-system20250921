import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient, resetPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Database connection reset API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    console.log('✅ DATABASE_URL confirmed')

    // Prismaクライアントをリセット
    console.log('🔄 Resetting Prisma client...')
    await resetPrismaClient()
    console.log('✅ Prisma client reset completed')

    // 新しいPrismaクライアントを取得
    const newPrisma = getPrismaClient()
    if (!newPrisma) {
      console.log('❌ Failed to get new Prisma client')
      return NextResponse.json({ error: 'Failed to get Prisma client' }, { status: 503 })
    }

    console.log('✅ New Prisma client obtained')

    // 簡単なクエリテスト
    console.log('🔄 Testing query execution...')
    const result = await newPrisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Query test successful:', result)

    // カテゴリテーブルのテスト
    console.log('🔄 Testing Category table access...')
    const categoryCount = await newPrisma.category.count()
    console.log('✅ Category table accessible, count:', categoryCount)

    return NextResponse.json({
      message: 'データベース接続がリセットされました',
      categoryCount: categoryCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error resetting database connection:', error)
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
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not available' }, { status: 503 })
    }

    const categoryCount = await prisma.category.count()
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, isActive: true },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({
      categoryCount,
      categories,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error checking database:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}