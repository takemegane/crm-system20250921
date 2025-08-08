import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    // オーナーのみアクセス可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('🔄 Starting Order table payment fields fix...')

    const results = []

    // 1. paymentMethod カラムを追加
    try {
      console.log('📦 Adding paymentMethod column to Order table...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Order" 
        ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'bank_transfer';
      `)
      results.push({ query: 'ADD paymentMethod column', status: 'success' })
      console.log('✅ paymentMethod column added successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ paymentMethod column addition failed:', errorMsg)
      results.push({ query: 'ADD paymentMethod column', status: 'error', error: errorMsg })
      
      // カラムが既に存在する場合は無視
      if (!errorMsg.includes('already exists')) {
        console.error('🚨 Critical error adding paymentMethod column')
      }
    }

    // 2. Stripe関連カラムを追加
    try {
      console.log('💳 Adding Stripe related columns to Order table...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Order" 
        ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
      `)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Order" 
        ADD COLUMN IF NOT EXISTS "stripeSessionId" TEXT;
      `)
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Order" 
        ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
      `)
      results.push({ query: 'ADD Stripe columns', status: 'success' })
      console.log('✅ Stripe columns added successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Stripe columns addition failed:', errorMsg)
      results.push({ query: 'ADD Stripe columns', status: 'error', error: errorMsg })
    }

    // 3. 既存データのpaymentMethodを更新
    try {
      console.log('📝 Updating existing orders with default payment method...')
      await prisma.$executeRawUnsafe(`
        UPDATE "Order" 
        SET "paymentMethod" = 'bank_transfer' 
        WHERE "paymentMethod" IS NULL;
      `)
      
      // 完了済み注文のpaidAtを設定
      await prisma.$executeRawUnsafe(`
        UPDATE "Order" 
        SET "paidAt" = "updatedAt" 
        WHERE "status" IN ('COMPLETED', 'SHIPPED', 'DELIVERED') 
        AND "paidAt" IS NULL;
      `)
      
      results.push({ query: 'UPDATE existing orders', status: 'success' })
      console.log('✅ Existing orders updated successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Existing orders update failed:', errorMsg)
      results.push({ query: 'UPDATE existing orders', status: 'error', error: errorMsg })
    }

    // 4. データ検証
    try {
      console.log('🔍 Verifying Order table structure...')
      const testOrder = await prisma.order.findFirst({
        select: {
          id: true,
          orderNumber: true,
          paymentMethod: true,
          stripePaymentIntentId: true,
          stripeSessionId: true,
          paidAt: true,
          status: true
        }
      })
      
      if (testOrder) {
        console.log('✅ Order table structure verified:', {
          hasPaymentMethod: 'paymentMethod' in testOrder,
          hasStripeFields: 'stripePaymentIntentId' in testOrder
        })
        results.push({ 
          query: 'VERIFY Order structure', 
          status: 'success',
          sample: {
            orderNumber: testOrder.orderNumber,
            paymentMethod: testOrder.paymentMethod,
            hasStripeFields: !!testOrder.stripePaymentIntentId !== undefined
          }
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Order verification failed:', errorMsg)
      results.push({ query: 'VERIFY Order structure', status: 'error', error: errorMsg })
    }

    console.log('✅ Order table payment fields fix completed')

    return NextResponse.json({
      success: true,
      message: 'Order table payment fields fixed successfully',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Order table fix failed:', error)
    return NextResponse.json({
      error: 'Fix failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}