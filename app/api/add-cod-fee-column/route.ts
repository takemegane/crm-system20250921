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

    console.log('🔄 Starting Order table codFee column addition...')

    const results = []

    // codFee カラムを追加
    try {
      console.log('💰 Adding codFee column to Order table...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Order" 
        ADD COLUMN IF NOT EXISTS "codFee" DECIMAL(10,2) DEFAULT 0;
      `)
      results.push({ query: 'ADD codFee column', status: 'success' })
      console.log('✅ codFee column added successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ codFee column addition failed:', errorMsg)
      results.push({ query: 'ADD codFee column', status: 'error', error: errorMsg })
      
      // カラムが既に存在する場合は無視
      if (!errorMsg.includes('already exists')) {
        console.error('🚨 Critical error adding codFee column')
      }
    }

    // 既存の代引き注文のcodFeeを更新
    try {
      console.log('📝 Updating existing COD orders with fee...')
      await prisma.$executeRawUnsafe(`
        UPDATE "Order" 
        SET "codFee" = 330 
        WHERE "paymentMethod" = 'cash_on_delivery' 
        AND ("codFee" IS NULL OR "codFee" = 0);
      `)
      results.push({ query: 'UPDATE existing COD orders', status: 'success' })
      console.log('✅ Existing COD orders updated successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ COD orders update failed:', errorMsg)
      results.push({ query: 'UPDATE existing COD orders', status: 'error', error: errorMsg })
    }

    // データ検証
    try {
      console.log('🔍 Verifying Order table structure...')
      const testOrder = await prisma.order.findFirst({
        select: {
          id: true,
          orderNumber: true,
          paymentMethod: true,
          codFee: true
        }
      })
      
      if (testOrder) {
        console.log('✅ Order table structure verified:', {
          hasPaymentMethod: 'paymentMethod' in testOrder,
          hasCodFee: 'codFee' in testOrder
        })
        results.push({ 
          query: 'VERIFY Order structure', 
          status: 'success',
          sample: {
            orderNumber: testOrder.orderNumber,
            paymentMethod: testOrder.paymentMethod,
            codFee: testOrder.codFee
          }
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Order verification failed:', errorMsg)
      results.push({ query: 'VERIFY Order structure', status: 'error', error: errorMsg })
    }

    console.log('✅ Order table codFee column addition completed')

    return NextResponse.json({
      success: true,
      message: 'Order table codFee column added successfully',
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