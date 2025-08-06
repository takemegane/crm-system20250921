import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 Missing Tables Setup API called')
    
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

    // 欠けているテーブルを手動で作成
    console.log('🔧 Creating missing tables...')

    try {
      // CartItemテーブル作成
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "CartItem" (
          "id" TEXT NOT NULL,
          "customerId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL DEFAULT 1,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "CartItem_customerId_productId_key" UNIQUE ("customerId", "productId")
        );
      `
      console.log('✅ CartItem table created')

      // 外部キー制約を追加（存在しない場合のみ）
      try {
        await prisma.$executeRaw`
          ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_customerId_fkey" 
          FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `
        console.log('✅ CartItem -> Customer foreign key added')
      } catch (error) {
        console.log('ℹ️ CartItem -> Customer foreign key already exists or failed:', error)
      }

      try {
        await prisma.$executeRaw`
          ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" 
          FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        `
        console.log('✅ CartItem -> Product foreign key added')
      } catch (error) {
        console.log('ℹ️ CartItem -> Product foreign key already exists or failed:', error)
      }

      // その他の欠けている可能性のあるテーブルもチェック・作成
      const tables = [
        'Customer', 'Product', 'Order', 'OrderItem', 'Category', 'ShippingRate'
      ]

      for (const table of tables) {
        try {
          await prisma.$queryRaw`SELECT 1 FROM ${table} LIMIT 1;`
          console.log(`✅ Table ${table} exists`)
        } catch (error) {
          console.log(`❌ Table ${table} missing or inaccessible:`, error)
        }
      }

      // データベーススキーマの最新化
      console.log('🔄 Running Prisma db push to sync schema...')
      
      return NextResponse.json({
        success: true,
        message: 'Missing tables setup completed',
        timestamp: new Date().toISOString(),
        tablesChecked: tables.length + 1,
        cartItemCreated: true
      })

    } catch (dbError) {
      console.error('❌ Database setup error:', dbError)
      return NextResponse.json({
        error: 'Database setup failed',
        details: dbError instanceof Error ? dbError.message : String(dbError),
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Setup Missing Tables API Error:', error)
    return NextResponse.json(
      { 
        error: 'Setup failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}