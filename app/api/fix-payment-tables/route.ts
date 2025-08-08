import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

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

    console.log('🔄 Starting complete payment tables fix...')

    const results = []

    // 1. PaymentSettingsテーブルを完全に削除して再作成
    try {
      console.log('🗑️ Dropping existing PaymentSettings table...')
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "PaymentSettings";`)
      results.push({ query: 'DROP PaymentSettings', status: 'success' })
      
      console.log('📦 Creating new PaymentSettings table...')
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "PaymentSettings" (
          "id" TEXT NOT NULL,
          "stripePublicKey" TEXT,
          "stripeSecretKey" TEXT,
          "stripeWebhookSecret" TEXT,
          "isTestMode" BOOLEAN NOT NULL DEFAULT true,
          "isActive" BOOLEAN NOT NULL DEFAULT false,
          "currency" TEXT NOT NULL DEFAULT 'jpy',
          "enableCreditCard" BOOLEAN NOT NULL DEFAULT false,
          "enableBankTransfer" BOOLEAN NOT NULL DEFAULT true,
          "enableCashOnDelivery" BOOLEAN NOT NULL DEFAULT true,
          "creditCardFeeType" TEXT NOT NULL DEFAULT 'percentage',
          "creditCardFeeRate" DOUBLE PRECISION NOT NULL DEFAULT 3.6,
          "creditCardFeeFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "bankTransferFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
          "cashOnDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 330,
          "creditCardFeeBearer" TEXT NOT NULL DEFAULT 'merchant',
          "bankTransferFeeBearer" TEXT NOT NULL DEFAULT 'customer',
          "cashOnDeliveryFeeBearer" TEXT NOT NULL DEFAULT 'customer',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
        );
      `)
      results.push({ query: 'CREATE PaymentSettings', status: 'success' })
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ PaymentSettings table recreation failed:', errorMsg)
      results.push({ query: 'RECREATE PaymentSettings', status: 'error', error: errorMsg })
    }

    // 2. EmailSettingsテーブルを完全に削除して再作成
    try {
      console.log('🗑️ Dropping existing EmailSettings table...')
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "EmailSettings";`)
      results.push({ query: 'DROP EmailSettings', status: 'success' })
      
      console.log('📧 Creating new EmailSettings table...')
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "EmailSettings" (
          "id" TEXT NOT NULL,
          "smtpHost" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
          "smtpPort" INTEGER NOT NULL DEFAULT 587,
          "smtpUser" TEXT,
          "smtpPass" TEXT,
          "fromAddress" TEXT,
          "fromName" TEXT NOT NULL DEFAULT 'CRM管理システム',
          "signature" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
        );
      `)
      results.push({ query: 'CREATE EmailSettings', status: 'success' })
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ EmailSettings table recreation failed:', errorMsg)
      results.push({ query: 'RECREATE EmailSettings', status: 'error', error: errorMsg })
    }

    // 3. デフォルト設定データを挿入
    try {
      console.log('⚙️ Inserting default PaymentSettings...')
      await prisma.$executeRawUnsafe(`
        INSERT INTO "PaymentSettings" (
          "id", "isTestMode", "isActive", "currency",
          "enableCreditCard", "enableBankTransfer", "enableCashOnDelivery",
          "creditCardFeeType", "creditCardFeeRate", "creditCardFeeFixed",
          "bankTransferFee", "cashOnDeliveryFee",
          "creditCardFeeBearer", "bankTransferFeeBearer", "cashOnDeliveryFeeBearer"
        ) VALUES (
          $1, true, false, 'jpy',
          false, true, true,
          'percentage', 3.6, 0,
          0, 330,
          'merchant', 'customer', 'customer'
        );
      `, [`payment-settings-${Date.now()}`])
      results.push({ query: 'INSERT PaymentSettings defaults', status: 'success' })
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ PaymentSettings defaults insertion failed:', errorMsg)
      results.push({ query: 'INSERT PaymentSettings defaults', status: 'error', error: errorMsg })
    }

    try {
      console.log('📧 Inserting default EmailSettings...')
      await prisma.$executeRawUnsafe(`
        INSERT INTO "EmailSettings" (
          "id", "smtpHost", "smtpPort", "fromName", "isActive"
        ) VALUES (
          $1, 'smtp.gmail.com', 587, 'CRM管理システム', false
        );
      `, [`email-settings-${Date.now()}`])
      results.push({ query: 'INSERT EmailSettings defaults', status: 'success' })
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ EmailSettings defaults insertion failed:', errorMsg)
      results.push({ query: 'INSERT EmailSettings defaults', status: 'error', error: errorMsg })
    }

    // 4. Prismaクライアントをリセット
    try {
      console.log('🔄 Resetting Prisma client...')
      // Prisma クライアントの内部キャッシュをクリア
      await prisma.$disconnect()
      results.push({ query: 'PRISMA CLIENT RESET', status: 'success' })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      results.push({ query: 'PRISMA CLIENT RESET', status: 'error', error: errorMsg })
    }

    console.log('✅ Payment tables fix completed')

    return NextResponse.json({
      success: true,
      message: 'Payment and Email tables completely fixed',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Payment tables fix failed:', error)
    return NextResponse.json({
      error: 'Fix failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}