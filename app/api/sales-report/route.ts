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

    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_ORDERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily' // daily, monthly, product, customer
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '10')

    // 日付範囲設定
    const now = new Date()
    let dateFilter: any = {}
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59.999Z')
        }
      }
    } else {
      // デフォルトは過去30日
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      dateFilter = {
        createdAt: {
          gte: thirtyDaysAgo,
          lte: now
        }
      }
    }

    // 注文ステータスフィルタ（完了済みの注文のみ）
    const statusFilter = {
      status: {
        in: ['COMPLETED', 'SHIPPED', 'DELIVERED']
      }
    }

    const whereCondition = {
      ...dateFilter,
      ...statusFilter
    }

    switch (type) {
      case 'daily':
        // 日別売上
        const dailySales = await prisma.order.groupBy({
          by: ['createdAt'],
          where: whereCondition,
          _sum: {
            totalAmount: true,
            shippingFee: true
          },
          _count: {
            id: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        })

        // 日別にグループ化
        const dailyGrouped: { [key: string]: { totalSales: number, orderCount: number, totalShipping: number } } = {}
        
        dailySales.forEach(order => {
          const date = new Date(order.createdAt).toISOString().split('T')[0]
          if (!dailyGrouped[date]) {
            dailyGrouped[date] = { totalSales: 0, orderCount: 0, totalShipping: 0 }
          }
          dailyGrouped[date].totalSales += order._sum.totalAmount || 0
          dailyGrouped[date].totalShipping += order._sum.shippingFee || 0
          dailyGrouped[date].orderCount += order._count.id
        })

        const dailyResult = Object.entries(dailyGrouped)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, limit)

        return NextResponse.json({ type: 'daily', data: dailyResult })

      case 'monthly':
        // 月別売上
        const monthlySales = await prisma.order.findMany({
          where: whereCondition,
          select: {
            id: true,
            totalAmount: true,
            shippingFee: true,
            createdAt: true
          }
        })

        const monthlyGrouped: { [key: string]: { totalSales: number, orderCount: number, totalShipping: number } } = {}
        
        monthlySales.forEach(order => {
          const date = new Date(order.createdAt)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyGrouped[monthKey]) {
            monthlyGrouped[monthKey] = { totalSales: 0, orderCount: 0, totalShipping: 0 }
          }
          monthlyGrouped[monthKey].totalSales += order.totalAmount || 0
          monthlyGrouped[monthKey].totalShipping += order.shippingFee || 0
          monthlyGrouped[monthKey].orderCount += 1
        })

        const monthlyResult = Object.entries(monthlyGrouped)
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => b.month.localeCompare(a.month))
          .slice(0, limit)

        return NextResponse.json({ type: 'monthly', data: monthlyResult })

      case 'product':
        // 商品別売上
        const productSales = await prisma.orderItem.groupBy({
          by: ['productName'],
          where: {
            order: whereCondition
          },
          _sum: {
            subtotal: true,
            quantity: true
          },
          _count: {
            id: true
          },
          orderBy: {
            _sum: {
              subtotal: 'desc'
            }
          },
          take: limit
        })

        const productResult = productSales.map(item => ({
          productName: item.productName,
          totalSales: item._sum.subtotal || 0,
          totalQuantity: item._sum.quantity || 0,
          orderCount: item._count.id
        }))

        return NextResponse.json({ type: 'product', data: productResult })

      case 'customer':
        // 顧客別売上（匿名化）
        const customerSales = await prisma.order.groupBy({
          by: ['customerId'],
          where: whereCondition,
          _sum: {
            totalAmount: true
          },
          _count: {
            id: true
          },
          orderBy: {
            _sum: {
              totalAmount: 'desc'
            }
          },
          take: limit
        })

        // 顧客名を取得
        const customerIds = customerSales.map(item => item.customerId).filter(Boolean)
        const customers = await prisma.customer.findMany({
          where: {
            id: { in: customerIds }
          },
          select: {
            id: true,
            name: true,
            email: true
          }
        })

        const customerMap = customers.reduce((acc, customer) => {
          acc[customer.id] = customer
          return acc
        }, {} as any)

        const customerResult = customerSales.map((item, index) => ({
          customerId: item.customerId,
          customerName: item.customerId ? customerMap[item.customerId]?.name || '不明' : 'ゲスト',
          customerEmail: item.customerId ? customerMap[item.customerId]?.email || '' : '',
          totalSales: item._sum.totalAmount || 0,
          orderCount: item._count.id,
          rank: index + 1
        }))

        return NextResponse.json({ type: 'customer', data: customerResult })

      case 'summary':
        // 概要データ
        const totalOrders = await prisma.order.count({
          where: whereCondition
        })

        const totalSales = await prisma.order.aggregate({
          where: whereCondition,
          _sum: {
            totalAmount: true,
            shippingFee: true
          }
        })

        const avgOrderValue = totalOrders > 0 ? 
          (totalSales._sum.totalAmount || 0) / totalOrders : 0

        // 今月と先月の比較
        const thisMonth = new Date()
        thisMonth.setDate(1) // 今月の1日
        const lastMonth = new Date(thisMonth)
        lastMonth.setMonth(lastMonth.getMonth() - 1)

        const thisMonthSales = await prisma.order.aggregate({
          where: {
            ...statusFilter,
            createdAt: {
              gte: thisMonth
            }
          },
          _sum: {
            totalAmount: true
          },
          _count: {
            id: true
          }
        })

        const lastMonthSales = await prisma.order.aggregate({
          where: {
            ...statusFilter,
            createdAt: {
              gte: lastMonth,
              lt: thisMonth
            }
          },
          _sum: {
            totalAmount: true
          },
          _count: {
            id: true
          }
        })

        const salesGrowth = lastMonthSales._sum.totalAmount ?
          ((thisMonthSales._sum.totalAmount || 0) - (lastMonthSales._sum.totalAmount || 0)) / (lastMonthSales._sum.totalAmount || 0) * 100 : 0

        const summaryResult = {
          totalOrders,
          totalSales: totalSales._sum.totalAmount || 0,
          totalShipping: totalSales._sum.shippingFee || 0,
          avgOrderValue,
          thisMonthSales: thisMonthSales._sum.totalAmount || 0,
          thisMonthOrders: thisMonthSales._count.id,
          lastMonthSales: lastMonthSales._sum.totalAmount || 0,
          lastMonthOrders: lastMonthSales._count.id,
          salesGrowth: Math.round(salesGrowth * 100) / 100
        }

        return NextResponse.json({ type: 'summary', data: summaryResult })

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

  } catch (error) {
    console.error('📊 Error generating sales report:', error)
    console.error('📊 Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}