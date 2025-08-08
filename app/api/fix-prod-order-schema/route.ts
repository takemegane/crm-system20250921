import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  try {
    console.log('🔄 Starting production Order table schema fix...')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const results = []
    const environment = process.env.VERCEL ? 'production' : 'development'
    console.log('🌍 Environment:', environment)

    // 1. codFee カラムを追加
    try {
      console.log('💰 Adding codFee column to Order table...')
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Order" 
        ADD COLUMN IF NOT EXISTS "codFee" DOUBLE PRECISION DEFAULT 0;
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

    // 2. 既存の代引き注文のcodFeeを更新
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

    // 3. データ検証
    try {
      console.log('🔍 Verifying Order table structure...')
      
      // codFeeカラムの存在確認
      const hasCodeFee = await prisma.$queryRaw`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'Order' 
          AND column_name = 'codFee'
          AND table_schema = 'public'
        ) as exists;
      `
      
      // サンプル注文の取得テスト
      const testOrder = await prisma.order.findFirst({
        select: {
          id: true,
          orderNumber: true,
          paymentMethod: true,
          codFee: true,
          totalAmount: true
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
          hasCodeFee: hasCodeFee,
          sample: {
            orderNumber: testOrder.orderNumber,
            paymentMethod: testOrder.paymentMethod,
            codFee: testOrder.codFee,
            totalAmount: testOrder.totalAmount
          }
        })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Order verification failed:', errorMsg)
      results.push({ query: 'VERIFY Order structure', status: 'error', error: errorMsg })
    }

    console.log('✅ Production Order table schema fix completed')

    return NextResponse.json({
      success: true,
      environment,
      message: 'Production Order table schema fixed successfully',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Production Order table fix failed:', error)
    return NextResponse.json({
      error: 'Production schema fix failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}