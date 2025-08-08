import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🔍 Debug orders API called')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    // まず注文の件数を確認
    const orderCount = await prisma.order.count()
    console.log('📦 Total orders:', orderCount)

    // 最初の注文を1件取得してフィールドを確認
    const sampleOrder = await prisma.order.findFirst({
      select: {
        id: true,
        orderNumber: true,
        subtotalAmount: true,
        shippingFee: true,
        codFee: true,
        totalAmount: true,
        status: true,
        paymentMethod: true
      }
    })
    console.log('📝 Sample order:', sampleOrder)

    // 新しいフィールドを含む注文リストの取得テスト
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        subtotalAmount: true,
        shippingFee: true,
        codFee: true,
        totalAmount: true,
        status: true,
        paymentMethod: true,
        customer: {
          select: {
            name: true,
            email: true
          }
        }
      },
      take: 3,
      orderBy: { orderedAt: 'desc' }
    })
    
    console.log('✅ Orders retrieved successfully:', orders.length)

    return NextResponse.json({
      success: true,
      totalOrders: orderCount,
      sampleOrder,
      recentOrders: orders,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Debug orders error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}