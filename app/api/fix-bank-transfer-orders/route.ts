import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  try {
    console.log('🔄 Starting bank transfer orders fix...')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const results = []
    const environment = process.env.VERCEL ? 'production' : 'development'
    console.log('🌍 Environment:', environment)

    // 1. PaymentSettingsから各支払い方法の手数料を取得
    const paymentSettings = await prisma.paymentSettings.findFirst({
      select: { 
        cashOnDeliveryFee: true,
        bankTransferFee: true,
        creditCardFeeType: true,
        creditCardFeeRate: true,
        creditCardFeeFixed: true,
        cashOnDeliveryFeeBearer: true,
        bankTransferFeeBearer: true,
        creditCardFeeBearer: true
      }
    })

    console.log('⚙️ Payment settings:', paymentSettings)

    // 2. 現在の手数料なし注文を確認
    const ordersNeedingFees = await prisma.order.findMany({
      where: {
        OR: [
          { 
            AND: [
              { paymentMethod: 'bank_transfer' },
              { codFee: 0 }
            ]
          },
          { 
            AND: [
              { paymentMethod: 'stripe' },
              { codFee: 0 }
            ]
          }
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

    console.log(`📦 Found ${ordersNeedingFees.length} orders needing fee updates:`, ordersNeedingFees)

    // 3. 各注文を修正
    for (const order of ordersNeedingFees) {
      try {
        console.log(`🔧 Fixing order ${order.orderNumber}...`)
        
        let processingFee = 0
        
        if (order.paymentMethod === 'bank_transfer') {
          // 銀行振込手数料
          if (paymentSettings?.bankTransferFeeBearer === 'customer') {
            processingFee = paymentSettings?.bankTransferFee || 0
          }
        } else if (order.paymentMethod === 'stripe') {
          // クレジットカード手数料
          if (paymentSettings?.creditCardFeeBearer === 'customer') {
            if (paymentSettings?.creditCardFeeType === 'percentage') {
              processingFee = Math.round((order.subtotalAmount || 0) * (paymentSettings?.creditCardFeeRate || 3.6) / 100)
            } else {
              processingFee = paymentSettings?.creditCardFeeFixed || 0
            }
          }
        }

        if (processingFee > 0) {
          // 新しい合計金額を計算
          const newTotalAmount = (order.subtotalAmount || 0) + (order.shippingFee || 0) + processingFee

          const updateData = {
            codFee: processingFee,
            totalAmount: newTotalAmount,
            updatedAt: new Date()
          }

          console.log(`📝 Updating order ${order.orderNumber}:`, {
            paymentMethod: order.paymentMethod,
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
            paymentMethod: order.paymentMethod,
            status: 'updated',
            changes: {
              processingFee: `${order.codFee || 0} → ${processingFee}`,
              totalAmount: `${order.totalAmount} → ${newTotalAmount}`
            }
          })
        } else {
          results.push({
            orderNumber: order.orderNumber,
            paymentMethod: order.paymentMethod,
            status: 'no_fee_required',
            reason: 'Fee bearer is merchant or fee is 0'
          })
        }

        console.log(`✅ Order ${order.orderNumber} processed successfully`)

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
    const updatedOrders = await prisma.order.findMany({
      where: {
        paymentMethod: { in: ['bank_transfer', 'stripe'] },
        codFee: { gt: 0 }
      },
      select: {
        orderNumber: true,
        paymentMethod: true,
        codFee: true,
        totalAmount: true
      }
    })

    console.log('✅ Payment method orders fix completed')

    return NextResponse.json({
      success: true,
      environment,
      message: 'Payment method orders fixed successfully',
      originalOrdersFound: ordersNeedingFees.length,
      paymentSettings: {
        bankTransferFee: paymentSettings?.bankTransferFee || 0,
        bankTransferFeeBearer: paymentSettings?.bankTransferFeeBearer || 'customer',
        creditCardFeeType: paymentSettings?.creditCardFeeType || 'percentage',
        creditCardFeeRate: paymentSettings?.creditCardFeeRate || 3.6,
        creditCardFeeFixed: paymentSettings?.creditCardFeeFixed || 0,
        creditCardFeeBearer: paymentSettings?.creditCardFeeBearer || 'merchant'
      },
      results,
      updatedOrders,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Payment method orders fix failed:', error)
    return NextResponse.json({
      error: 'Payment method orders fix failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}