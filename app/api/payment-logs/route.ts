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
    const session = await getServerSession(authOptions)
    
    // 決済ログ閲覧権限チェック
    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_PAYMENT_LOGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('💳 Payment Logs API called')
    const prisma = getPrismaClient()
    
    if (!prisma) {
      console.error('❌ Prisma client not available')
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status') // 'completed', 'pending', 'failed', null for all
    const paymentMethod = searchParams.get('paymentMethod') // 'stripe', 'bank_transfer', null for all
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const export_csv = searchParams.get('export') === 'csv'
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : null
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : null
    
    const offset = (page - 1) * limit

    // フィルター条件の構築
    const whereClause: any = {}
    
    // 日付範囲でフィルタ
    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = startDate
      }
      if (endDate) {
        // 終了日の23:59:59まで含める
        const endOfDay = new Date(endDate)
        endOfDay.setHours(23, 59, 59, 999)
        whereClause.createdAt.lte = endOfDay
      }
    }
    
    // 決済方法でフィルタ
    if (paymentMethod) {
      whereClause.paymentMethod = paymentMethod
    }
    
    // 決済状態でフィルタ（修正版）
    if (status === 'completed') {
      whereClause.status = { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
    } else if (status === 'pending') {
      whereClause.status = { in: ['PENDING', 'PROCESSING'] }
    } else if (status === 'failed') {
      whereClause.status = { in: ['FAILED', 'CANCELLED'] }
    }

    // 決済ログ（注文データベース）の取得
    const [paymentLogs, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        select: {
          id: true,
          orderNumber: true,
          customerId: true,
          totalAmount: true,
          paymentMethod: true,
          stripePaymentIntentId: true,
          stripeSessionId: true,
          paidAt: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder as 'asc' | 'desc'
        },
        skip: export_csv ? undefined : offset,
        take: export_csv ? undefined : limit
      }),
      prisma.order.count({ where: whereClause })
    ])

    // 決済状況の統計情報（修正版）
    const [completedCount, pendingCount, failedCount, totalRevenue] = await Promise.all([
      prisma.order.count({
        where: {
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
        }
      }),
      prisma.order.count({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      }),
      prisma.order.count({
        where: {
          status: { in: ['FAILED', 'CANCELLED'] }
        }
      }),
      prisma.order.aggregate({
        where: {
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
        },
        _sum: { totalAmount: true }
      })
    ])

    // 決済方法別統計（修正版）
    const paymentMethodStats = await prisma.order.groupBy({
      by: ['paymentMethod'],
      where: {
        paymentMethod: { not: null },
        status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
      },
      _count: { paymentMethod: true },
      _sum: { totalAmount: true }
    })

    // CSV出力の場合
    if (export_csv) {
      const csvHeaders = [
        '注文番号',
        '顧客名',
        '顧客メール',
        '金額',
        '決済方法',
        '決済状態',
        '決済日時',
        '注文日時',
        'Stripe決済ID',
        'StripeセッションID'
      ]

      const csvRows = paymentLogs.map(log => {
        const paymentStatus = ['COMPLETED', 'SHIPPED', 'DELIVERED'].includes(log.status) ? '完了' :
                             ['PENDING', 'PROCESSING'].includes(log.status) ? '保留中' : '失敗'
        
        const paymentMethodName = log.paymentMethod === 'stripe' ? 'クレジットカード' :
                                 log.paymentMethod === 'bank_transfer' ? '銀行振込' :
                                 log.paymentMethod === 'cash_on_delivery' ? '代引き' :
                                 log.paymentMethod === 'cod' ? '代引き' : '未設定'
        
        return [
          log.orderNumber || '',
          log.customer?.name || '',
          log.customer?.email || '',
          log.totalAmount.toString(),
          paymentMethodName,
          paymentStatus,
          log.paidAt ? new Date(log.paidAt).toLocaleString('ja-JP') : '',
          new Date(log.createdAt).toLocaleString('ja-JP'),
          log.stripePaymentIntentId || '',
          log.stripeSessionId || ''
        ]
      })

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(','))
        .join('\n')

      const filename = `payment_logs_${new Date().toISOString().split('T')[0]}.csv`
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    const response = {
      paymentLogs: paymentLogs.map(log => ({
        ...log,
        customer: log.customer ? {
          name: log.customer.name,
          email: log.customer.email
        } : null,
        // 決済状態の判定（修正版）
        paymentStatus: ['COMPLETED', 'SHIPPED', 'DELIVERED'].includes(log.status) ? 'completed' :
                       ['PENDING', 'PROCESSING'].includes(log.status) ? 'pending' : 'failed'
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit
      },
      statistics: {
        completedPayments: completedCount,
        pendingPayments: pendingCount,
        failedPayments: failedCount,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        paymentMethods: paymentMethodStats.map(stat => ({
          method: stat.paymentMethod,
          count: stat._count.paymentMethod,
          totalAmount: stat._sum.totalAmount || 0
        }))
      },
      filters: {
        status,
        paymentMethod,
        sortBy,
        sortOrder
      }
    }

    console.log('✅ Payment logs retrieved:', {
      count: paymentLogs.length,
      totalCount,
      page,
      completedPayments: completedCount
    })

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Payment logs API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}