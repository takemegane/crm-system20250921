import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Fix Order Table API called')
    
    const session = await getServerSession(authOptions)
    
    // オーナー権限のみ実行可能
    if (!session || session.user?.role !== 'OWNER') {
      console.log('❌ Permission denied - OWNER access required')
      return NextResponse.json({ error: 'OWNER access required' }, { status: 403 })
    }
    
    console.log('✅ OWNER permission confirmed')

    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('🔄 Fixing Order table structure...')

    try {
      // recipientAddressカラムが存在する場合は削除
      try {
        await prisma.$executeRaw`
          ALTER TABLE "Order" DROP COLUMN IF EXISTS "recipientAddress";
        `
        console.log('✅ recipientAddress column dropped if existed')
      } catch (error) {
        console.log('ℹ️ recipientAddress column drop failed or not needed:', error)
      }

      // shippingAddressカラムが存在しない場合は追加
      try {
        await prisma.$executeRaw`
          ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingAddress" TEXT;
        `
        console.log('✅ shippingAddress column added if not exists')
      } catch (error) {
        console.log('ℹ️ shippingAddress column add failed or already exists:', error)
      }

      // テーブル構造確認
      const orderTableInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'Order' AND column_name IN ('shippingAddress', 'recipientAddress')
        ORDER BY column_name;
      `
      console.log('📊 Order table address columns:', orderTableInfo)

      return NextResponse.json({
        success: true,
        message: 'Order table structure fixed',
        timestamp: new Date().toISOString(),
        addressColumns: orderTableInfo
      })

    } catch (dbError) {
      console.error('❌ Database fix error:', dbError)
      return NextResponse.json({
        error: 'Database fix failed',
        details: dbError instanceof Error ? dbError.message : String(dbError),
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Fix Order Table API Error:', error)
    return NextResponse.json(
      { 
        error: 'Fix failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}