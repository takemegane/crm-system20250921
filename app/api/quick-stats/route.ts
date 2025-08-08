import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 今月の開始日
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    // 並行してデータを取得
    const [
      totalCustomers,
      totalOrders,
      totalSales,
      newCustomersThisMonth
    ] = await Promise.all([
      // 総顧客数（アーカイブ除く）
      prisma.customer.count({
        where: {
          isArchived: false
        }
      }),

      // 総注文数（キャンセル除く）
      prisma.order.count({
        where: {
          status: {
            not: 'CANCELLED'
          }
        }
      }),

      // 総売上（キャンセル除く）
      prisma.order.aggregate({
        where: {
          status: {
            not: 'CANCELLED'
          }
        },
        _sum: {
          totalAmount: true
        }
      }),

      // 今月の新規顧客数
      prisma.customer.count({
        where: {
          isArchived: false,
          createdAt: {
            gte: thisMonth
          }
        }
      })
    ])

    const data = {
      totalCustomers,
      totalOrders,
      totalSales: totalSales._sum.totalAmount || 0,
      newCustomersThisMonth
    }

    return NextResponse.json({ 
      success: true, 
      data 
    })

  } catch (error) {
    console.error('Error fetching quick stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}