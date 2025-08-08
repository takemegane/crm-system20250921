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

    // 日付範囲設定
    const now = new Date()
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const thisWeek = new Date()
    thisWeek.setDate(now.getDate() - 7)
    thisWeek.setHours(0, 0, 0, 0)

    // 並行してデータを取得
    const [
      totalCustomers,
      activeCustomers,
      newThisMonth,
      newThisWeek,
      archivedCustomers,
      topCustomersData
    ] = await Promise.all([
      // 総顧客数
      prisma.customer.count(),

      // アクティブ顧客数（アーカイブされていない）
      prisma.customer.count({
        where: {
          isArchived: false
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
      }),

      // 今週の新規顧客数
      prisma.customer.count({
        where: {
          isArchived: false,
          createdAt: {
            gte: thisWeek
          }
        }
      }),

      // アーカイブされた顧客数
      prisma.customer.count({
        where: {
          isArchived: true
        }
      }),

      // 上位顧客（注文額ベース）
      prisma.customer.findMany({
        where: {
          isArchived: false,
          orders: {
            some: {
              status: {
                not: 'CANCELLED'
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          orders: {
            where: {
              status: {
                not: 'CANCELLED'
              }
            },
            select: {
              totalAmount: true
            }
          }
        },
        take: 5
      })
    ])

    // 上位顧客データの加工
    const topCustomers = topCustomersData.map(customer => {
      const totalSpent = customer.orders.reduce((sum, order) => sum + order.totalAmount, 0)
      const totalOrders = customer.orders.length
      
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        totalSpent,
        totalOrders
      }
    })
    .filter(customer => customer.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent)

    const data = {
      totalCustomers,
      activeCustomers,
      newThisMonth,
      newThisWeek,
      archivedCustomers,
      topCustomers
    }

    return NextResponse.json({ 
      success: true, 
      data 
    })

  } catch (error) {
    console.error('Error fetching customer stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}