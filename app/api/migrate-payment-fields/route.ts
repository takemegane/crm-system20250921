import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 本番環境での決済フィールド追加マイグレーション
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // オーナー権限のみ実行可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Owner access required' },
        { status: 403 }
      )
    }

    console.log('🔧 Starting payment fields migration...')

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    // PostgreSQLで決済フィールドを追加
    await prisma.$executeRaw`
      ALTER TABLE "Product" 
      ADD COLUMN IF NOT EXISTS "enablePayment" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "stripeProductId" TEXT,
      ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
    `

    console.log('✅ Payment fields migration completed')

    // PaymentSettingsテーブルも確認・作成
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "PaymentSettings" (
        id TEXT NOT NULL PRIMARY KEY,
        "stripePublicKey" TEXT,
        "stripeSecretKey" TEXT,
        "stripeWebhookSecret" TEXT,
        "isTestMode" BOOLEAN NOT NULL DEFAULT true,
        "isActive" BOOLEAN NOT NULL DEFAULT false,
        currency TEXT NOT NULL DEFAULT 'jpy',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `

    console.log('✅ PaymentSettings table migration completed')

    // 初期設定データを作成
    await prisma.$executeRaw`
      INSERT INTO "PaymentSettings" (id, "isTestMode", "isActive", currency)
      VALUES ('default', true, false, 'jpy')
      ON CONFLICT (id) DO NOTHING;
    `

    console.log('✅ Default payment settings created')

    return NextResponse.json({
      success: true,
      message: 'Payment fields migration completed successfully'
    })
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}