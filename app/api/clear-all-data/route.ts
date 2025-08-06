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
    console.log('🗑️ Clear all data API called')
    
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

    // 認証とOWNER権限チェック（危険な操作のため）
    const session = await getServerSession(authOptions)
    console.log('👤 Session user:', session?.user?.email || 'No session', 'role:', session?.user?.role)
    
    if (!session || session.user.role !== 'OWNER') {
      console.log('❌ Permission denied - OWNER role required')
      return NextResponse.json({ error: 'OWNER権限が必要です' }, { status: 403 })
    }
    
    console.log('✅ OWNER permission confirmed')

    // 注文関連データの削除（外部キー制約のため先に削除）
    console.log('🔄 Deleting order items...')
    await prisma.orderItem.deleteMany({})
    
    console.log('🔄 Deleting orders...')
    await prisma.order.deleteMany({})
    
    console.log('🔄 Deleting cart items...')
    await prisma.cartItem.deleteMany({})

    // 商品データの削除
    console.log('🔄 Deleting products...')
    await prisma.product.deleteMany({})

    // 送料設定の削除
    console.log('🔄 Deleting shipping rates...')
    await prisma.shippingRate.deleteMany({})

    // カテゴリの削除（最後に削除）
    console.log('🔄 Deleting categories...')
    await prisma.category.deleteMany({})

    console.log('🎉 All product-related data cleared successfully')
    return NextResponse.json({
      message: '商品・カテゴリ・送料データが正常にクリアされました',
      cleared: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error clearing data:', error)
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