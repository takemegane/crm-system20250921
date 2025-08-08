import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // オーナーのみアクセス可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('🔍 Verifying sales difference...')

    // 各ステータスの注文数と金額を取得
    const [
      completedStats,
      pendingStats,
      cancelledStats,
      allOrdersStats,
      statusBreakdown
    ] = await Promise.all([
      // 決済ログの集計方法（完了済みのみ）
      prisma.order.aggregate({
        where: {
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      
      // 保留中の注文
      prisma.order.aggregate({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] }
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      
      // キャンセル済み
      prisma.order.aggregate({
        where: {
          status: 'CANCELLED'
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      
      // 売上レポートの集計方法（キャンセル以外すべて）
      prisma.order.aggregate({
        where: {
          status: { not: 'CANCELLED' }
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      
      // ステータス別の詳細
      prisma.order.groupBy({
        by: ['status'],
        _sum: { totalAmount: true },
        _count: { id: true }
      })
    ])

    const result = {
      timestamp: new Date().toISOString(),
      
      // 決済ログ方式（完了済みのみ）
      paymentLogsMethod: {
        description: '決済ログの集計方法（COMPLETED, SHIPPED, DELIVERED）',
        totalAmount: completedStats._sum.totalAmount || 0,
        orderCount: completedStats._count.id,
        status: ['COMPLETED', 'SHIPPED', 'DELIVERED']
      },
      
      // 売上レポート方式（キャンセル以外）
      salesReportMethod: {
        description: '売上レポートの集計方法（CANCELLED以外すべて）',
        totalAmount: allOrdersStats._sum.totalAmount || 0,
        orderCount: allOrdersStats._count.id,
        status: 'NOT CANCELLED (includes PENDING)'
      },
      
      // 差額
      difference: {
        amount: (allOrdersStats._sum.totalAmount || 0) - (completedStats._sum.totalAmount || 0),
        orderCount: allOrdersStats._count.id - completedStats._count.id,
        reason: '保留中（PENDING/PROCESSING）の注文が売上レポートには含まれているため'
      },
      
      // 保留中の詳細
      pendingOrders: {
        description: '保留中の注文（差額の原因）',
        totalAmount: pendingStats._sum.totalAmount || 0,
        orderCount: pendingStats._count.id,
        status: ['PENDING', 'PROCESSING']
      },
      
      // キャンセル済み
      cancelledOrders: {
        description: 'キャンセル済みの注文（両方で除外）',
        totalAmount: cancelledStats._sum.totalAmount || 0,
        orderCount: cancelledStats._count.id,
        status: ['CANCELLED']
      },
      
      // ステータス別詳細
      statusBreakdown: statusBreakdown.map(item => ({
        status: item.status,
        count: item._count.id,
        totalAmount: item._sum.totalAmount || 0
      })),
      
      // 推奨事項
      recommendation: '売上レポートと決済ログで同じ集計基準を使用することを推奨します。通常は「完了済み（COMPLETED, SHIPPED, DELIVERED）」のみを売上として計上するのが適切です。'
    }

    console.log('✅ Sales difference analysis completed')

    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Sales difference verification error:', error)
    return NextResponse.json({
      error: 'Verification failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}