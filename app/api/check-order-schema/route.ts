import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
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

    console.log('🔍 Checking Order table schema...')

    // PostgreSQLのテーブル構造を確認
    const schemaInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'Order' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `

    console.log('📋 Order table schema:', schemaInfo)

    // 特定のカラムの存在確認
    const hasCodeFee = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Order' 
        AND column_name = 'codFee'
        AND table_schema = 'public'
      ) as exists;
    `

    const hasPaymentMethod = await prisma.$queryRaw`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Order' 
        AND column_name = 'paymentMethod'
        AND table_schema = 'public'
      ) as exists;
    `

    // サンプル注文データの取得テスト
    let sampleOrder = null
    try {
      sampleOrder = await prisma.order.findFirst({
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          // codFeeフィールドがない場合はエラーになる可能性がある
        }
      })
    } catch (error) {
      console.error('❌ Error fetching sample order:', error)
    }

    return NextResponse.json({
      success: true,
      environment: process.env.VERCEL ? 'production' : 'development',
      schemaInfo,
      hasCodeFee: hasCodeFee,
      hasPaymentMethod: hasPaymentMethod,
      sampleOrder,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Schema check error:', error)
    return NextResponse.json({
      error: 'Schema check failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}