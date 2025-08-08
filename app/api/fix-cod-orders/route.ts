import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  try {
    console.log('🔄 Starting COD orders fix...')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const results = []
    const environment = process.env.VERCEL ? 'production' : 'development'
    console.log('🌍 Environment:', environment)

    // 1. 現在の代引き注文を確認
    const codOrders = await prisma.order.findMany({
      where: {
        OR: [
          { paymentMethod: 'cod' },
          { paymentMethod: 'cash_on_delivery' }
        ]
      },
      select: {
        id: true,
        orderNumber: true,
        paymentMethod: true,
        codFee: true,
        totalAmount: true,
        subtotalAmount: true,
        shippingFee: true
      }
    })

    console.log(`📦 Found ${codOrders.length} COD orders:`, codOrders)

    // 2. PaymentSettingsから代引き手数料を取得
    const paymentSettings = await prisma.paymentSettings.findFirst({
      select: { cashOnDeliveryFee: true }
    })
    const codFee = paymentSettings?.cashOnDeliveryFee || 330 // デフォルト330円
    console.log('💰 COD fee from settings:', codFee)

    // 3. 各注文を修正
    for (const order of codOrders) {
      try {
        console.log(`🔧 Fixing order ${order.orderNumber}...`)
        
        // 現在のcodFeeが0または未設定の場合のみ更新
        if (!order.codFee || order.codFee === 0) {
          // 新しい合計金額を計算
          const newTotalAmount = (order.subtotalAmount || 0) + (order.shippingFee || 0) + codFee

          const updateData: any = {
            paymentMethod: 'cash_on_delivery', // codをcash_on_deliveryに統一
            codFee: codFee,
            totalAmount: newTotalAmount,
            updatedAt: new Date()
          }

          console.log(`📝 Updating order ${order.orderNumber}:`, {
            oldPaymentMethod: order.paymentMethod,
            newPaymentMethod: updateData.paymentMethod,
            oldCodFee: order.codFee,
            newCodFee: updateData.codFee,
            oldTotalAmount: order.totalAmount,
            newTotalAmount: updateData.totalAmount
          })

          await prisma.order.update({
            where: { id: order.id },
            data: updateData
          })

          results.push({
            orderNumber: order.orderNumber,
            status: 'updated',
            changes: {
              paymentMethod: `${order.paymentMethod} → cash_on_delivery`,
              codFee: `${order.codFee || 0} → ${codFee}`,
              totalAmount: `${order.totalAmount} → ${newTotalAmount}`
            }
          })
        } else {
          // codFeeが既に設定済みの場合はpaymentMethodのみ統一
          await prisma.order.update({
            where: { id: order.id },
            data: {
              paymentMethod: 'cash_on_delivery',
              updatedAt: new Date()
            }
          })

          results.push({
            orderNumber: order.orderNumber,
            status: 'payment_method_only',
            changes: {
              paymentMethod: `${order.paymentMethod} → cash_on_delivery`
            }
          })
        }

        console.log(`✅ Order ${order.orderNumber} fixed successfully`)

      } catch (error) {
        console.error(`❌ Error fixing order ${order.orderNumber}:`, error)
        results.push({
          orderNumber: order.orderNumber,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    // 4. 修正後の状態確認
    const updatedCodOrders = await prisma.order.findMany({
      where: {
        paymentMethod: 'cash_on_delivery'
      },
      select: {
        orderNumber: true,
        paymentMethod: true,
        codFee: true,
        totalAmount: true
      }
    })

    console.log('✅ COD orders fix completed')

    return NextResponse.json({
      success: true,
      environment,
      message: 'COD orders fixed successfully',
      originalOrdersFound: codOrders.length,
      codFeeFromSettings: codFee,
      results,
      updatedOrders: updatedCodOrders,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ COD orders fix failed:', error)
    return NextResponse.json({
      error: 'COD orders fix failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}