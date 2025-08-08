import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // オーナーのみアクセス可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    console.log('🔍 Debug payment logs API called')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const debugResults = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    }

    // 1. 権限確認テスト
    try {
      const hasPermissionResult = hasPermission(session.user.role as UserRole, 'VIEW_PAYMENT_LOGS')
      debugResults.tests.push({
        name: 'Permission Check',
        status: 'success',
        userRole: session.user.role,
        hasViewPaymentLogsPermission: hasPermissionResult
      })
    } catch (error) {
      debugResults.tests.push({
        name: 'Permission Check',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 2. Order テーブル基本テスト
    try {
      const orderCount = await prisma.order.count()
      debugResults.tests.push({
        name: 'Order Table Count',
        status: 'success',
        count: orderCount
      })
    } catch (error) {
      debugResults.tests.push({
        name: 'Order Table Count',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 3. 決済ログ用クエリテスト（payment-logs APIと同じ）
    try {
      const paymentLogs = await prisma.order.findMany({
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
          createdAt: 'desc'
        },
        take: 5
      })
      
      debugResults.tests.push({
        name: 'Payment Logs Query',
        status: 'success',
        sampleCount: paymentLogs.length,
        sampleData: paymentLogs.map(log => ({
          id: log.id,
          orderNumber: log.orderNumber,
          status: log.status,
          paymentMethod: log.paymentMethod,
          totalAmount: log.totalAmount,
          hasCustomer: !!log.customer
        }))
      })
    } catch (error) {
      debugResults.tests.push({
        name: 'Payment Logs Query',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 4. 統計情報テスト
    try {
      const completedCount = await prisma.order.count({
        where: {
          status: { in: ['COMPLETED', 'SHIPPED', 'DELIVERED'] }
        }
      })
      
      const pendingCount = await prisma.order.count({
        where: {
          status: { in: ['PENDING', 'PROCESSING'] }
        }
      })
      
      debugResults.tests.push({
        name: 'Payment Statistics',
        status: 'success',
        completedCount,
        pendingCount
      })
    } catch (error) {
      debugResults.tests.push({
        name: 'Payment Statistics',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    return NextResponse.json(debugResults)
    
  } catch (error) {
    console.error('Debug payment logs API error:', error)
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}