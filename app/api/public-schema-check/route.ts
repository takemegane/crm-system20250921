import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🔍 Public schema check API called')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

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

    // 注文件数を確認
    let orderCount = 0
    try {
      orderCount = await prisma.order.count()
    } catch (error) {
      console.error('❌ Error counting orders:', error)
    }

    return NextResponse.json({
      success: true,
      environment: process.env.VERCEL ? 'production' : 'development',
      databaseType: process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 'Other',
      schemaInfo,
      hasCodeFee: hasCodeFee,
      hasPaymentMethod: hasPaymentMethod,
      orderCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Public schema check error:', error)
    return NextResponse.json({
      error: 'Schema check failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}