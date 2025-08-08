import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  try {
    console.log('🔄 Starting null payment methods fix...')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const results = []
    const environment = process.env.VERCEL ? 'production' : 'development'
    console.log('🌍 Environment:', environment)

    // 1. paymentMethodがnullの注文を確認
    const nullPaymentMethodOrders = await prisma.order.findMany({
      where: {
        paymentMethod: null
      },
      select: {
        id: true,
        orderNumber: true,
        paymentMethod: true,
        codFee: true,
        totalAmount: true,
        subtotalAmount: true,
        shippingFee: true,
        status: true,
        orderedAt: true
      },
      orderBy: { orderedAt: 'desc' }
    })

    console.log(`📦 Found ${nullPaymentMethodOrders.length} orders with null paymentMethod`)

    // 2. 各注文の決済方法を推定
    for (const order of nullPaymentMethodOrders) {
      try {
        console.log(`🔧 Analyzing order ${order.orderNumber}...`)
        
        let estimatedPaymentMethod = 'bank_transfer' // デフォルトは銀行振込
        let reason = 'Default assumption'
        
        // 代引き手数料がある場合は代引きと推定
        if (order.codFee && order.codFee > 0) {
          estimatedPaymentMethod = 'cash_on_delivery'
          reason = 'Has COD fee'
        }
        // 過去の注文パターンに基づく推定ロジック
        else if (order.totalAmount === (order.subtotalAmount || 0) + (order.shippingFee || 0)) {
          // 手数料なしの場合は銀行振込の可能性が高い
          estimatedPaymentMethod = 'bank_transfer'
          reason = 'No processing fee'
        }

        console.log(`📝 Updating order ${order.orderNumber} to ${estimatedPaymentMethod} (${reason})`)

        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentMethod: estimatedPaymentMethod,
            updatedAt: new Date()
          }
        })

        results.push({
          orderNumber: order.orderNumber,
          oldPaymentMethod: null,
          newPaymentMethod: estimatedPaymentMethod,
          reason: reason,
          orderedAt: order.orderedAt,
          status: 'updated'
        })

        console.log(`✅ Order ${order.orderNumber} updated successfully`)

      } catch (error) {
        console.error(`❌ Error fixing order ${order.orderNumber}:`, error)
        results.push({
          orderNumber: order.orderNumber,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // 3. 修正後の状態確認
    const remainingNullOrders = await prisma.order.count({
      where: { paymentMethod: null }
    })

    console.log('✅ Null payment methods fix completed')

    return NextResponse.json({
      success: true,
      environment,
      message: 'Null payment methods fixed successfully',
      originalOrdersFound: nullPaymentMethodOrders.length,
      remainingNullOrders,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Null payment methods fix failed:', error)
    return NextResponse.json({
      error: 'Null payment methods fix failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}