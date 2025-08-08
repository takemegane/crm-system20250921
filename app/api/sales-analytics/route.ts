import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // 管理者権限のみアクセス可能
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('📊 Sales Analytics API called')
    const prisma = getPrismaClient()
    
    if (!prisma) {
      console.error('❌ Prisma client not available')
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }
    
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30days' // 30days, 90days, 1year, all
    const groupBy = searchParams.get('groupBy') || 'day' // day, week, month
    const export_csv = searchParams.get('export') === 'csv'
    const customStartDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : null
    const customEndDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null
    
    // 期間の設定
    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    
    // カスタム日付範囲が指定されている場合はそれを優先
    if (customStartDate || customEndDate) {
      startDate = customStartDate || new Date(2020, 0, 1)
      if (customEndDate) {
        endDate = new Date(customEndDate)
        endDate.setHours(23, 59, 59, 999) // 終了日の23:59:59まで含める
      }
    } else {
      // 従来の期間指定
      switch (period) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case '1year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        case 'all':
        default:
          startDate = new Date(2020, 0, 1) // 十分に過去の日付
          break
      }
    }

    // 基本統計の取得
    const [totalOrders, totalRevenue, cancelledOrders, avgOrderValue] = await Promise.all([
      // 総注文数（完了済みのみ）
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
        }
      }),
      // 総売上（完了済みのみ）
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
        },
        _sum: { totalAmount: true }
      }),
      // キャンセル注文数
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'CANCELLED'
        }
      }),
      // 平均注文金額（完了済みのみ）
      prisma.order.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
        },
        _avg: { totalAmount: true }
      })
    ])

    // 期間別売上データ（Prismaクエリで安全に取得）
    const allOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
      },
      select: {
        createdAt: true,
        totalAmount: true,
        customerId: true
      },
      orderBy: { createdAt: 'desc' },
      take: 1000 // 最大1000件に制限
    })

    // JavaScript でグループ化処理
    const periodMap = new Map<string, { order_count: number; total_revenue: number }>()
    
    allOrders.forEach(order => {
      let period: string
      const date = new Date(order.createdAt)
      
      if (groupBy === 'day') {
        period = date.toISOString().split('T')[0] // YYYY-MM-DD
      } else if (groupBy === 'week') {
        const year = date.getFullYear()
        const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))
        period = `${year}-W${week.toString().padStart(2, '0')}`
      } else {
        period = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      }
      
      if (!periodMap.has(period)) {
        periodMap.set(period, { order_count: 0, total_revenue: 0 })
      }
      
      const stats = periodMap.get(period)!
      stats.order_count++
      stats.total_revenue += order.totalAmount
    })

    const salesByPeriod = Array.from(periodMap.entries())
      .map(([period, stats]) => ({
        period,
        order_count: stats.order_count,
        total_revenue: stats.total_revenue
      }))
      .sort((a, b) => b.period.localeCompare(a.period))
      .slice(0, 50)

    // 商品別売上ランキング（Prismaクエリで安全に取得）
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
        }
      },
      select: {
        productName: true,
        quantity: true,
        subtotal: true
      }
    })

    // JavaScript で商品別集計
    const productMap = new Map<string, { quantity_sold: number; total_revenue: number }>()
    
    orderItems.forEach(item => {
      if (!productMap.has(item.productName)) {
        productMap.set(item.productName, { quantity_sold: 0, total_revenue: 0 })
      }
      
      const stats = productMap.get(item.productName)!
      stats.quantity_sold += item.quantity
      stats.total_revenue += item.subtotal
    })

    const productSales = Array.from(productMap.entries())
      .map(([product_name, stats]) => ({
        product_name,
        quantity_sold: stats.quantity_sold,
        total_revenue: stats.total_revenue
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10)

    // 顧客統計（Prismaクエリで安全に取得）
    const uniqueCustomers = new Set(allOrders.map(o => o.customerId))
    const recentThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentCustomers = new Set(
      allOrders
        .filter(o => new Date(o.createdAt) >= recentThreshold)
        .map(o => o.customerId)
    )

    const customerStats = [{
      active_customers: uniqueCustomers.size,
      recent_customers: recentCustomers.size
    }]

    // 売上推移の前期比較
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))
    const previousRevenue = await prisma.order.aggregate({
      where: {
        createdAt: { 
          gte: previousPeriodStart,
          lt: startDate 
        },
        status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
      },
      _sum: { totalAmount: true }
    })

    const currentRevenue = totalRevenue._sum.totalAmount || 0
    const prevRevenue = previousRevenue._sum.totalAmount || 0
    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0

    // CSV出力の場合
    if (export_csv) {
      const csvHeaders = [
        '期間',
        '注文件数',
        '売上金額',
        '平均注文金額'
      ]

      const csvRows = salesByPeriod.reverse().map(item => [
        item.period,
        item.order_count.toString(),
        item.total_revenue.toString(),
        item.order_count > 0 ? (item.total_revenue / item.order_count).toFixed(0) : '0'
      ])

      // 商品別売上も追加
      const productCsvHeaders = [
        '',
        '',
        '',
        '',
        '商品名',
        '販売数量',
        '売上金額'
      ]

      const productCsvRows = productSales.map(product => [
        '', '', '', '',
        product.product_name,
        product.quantity_sold.toString(),
        product.total_revenue.toString()
      ])

      const csvContent = [
        csvHeaders,
        ...csvRows,
        [], // 空行
        ['商品別売上ランキング'],
        productCsvHeaders,
        ...productCsvRows
      ].map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const filename = `sales_report_${new Date().toISOString().split('T')[0]}.csv`
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const analytics = {
      summary: {
        totalOrders,
        totalRevenue: currentRevenue,
        cancelledOrders,
        avgOrderValue: avgOrderValue._avg.totalAmount || 0,
        activeCustomers: customerStats[0]?.active_customers || 0,
        recentCustomers: customerStats[0]?.recent_customers || 0,
        revenueGrowth: Number(revenueGrowth.toFixed(2))
      },
      salesByPeriod: salesByPeriod.reverse(), // 古い順に並び替え
      productSales,
      period,
      groupBy,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    }

    console.log('✅ Sales analytics generated:', {
      period,
      totalOrders,
      totalRevenue: currentRevenue,
      dataPoints: salesByPeriod.length
    })

    return NextResponse.json(analytics)
    
  } catch (error) {
    console.error('❌ Sales analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}