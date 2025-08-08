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

    console.log('🔄 Starting PaymentSettings and EmailSettings table migration...')

    // PaymentSettings テーブル作成
    const createPaymentTableQuery = `
      CREATE TABLE IF NOT EXISTS "PaymentSettings" (
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
    `

    // EmailSettings テーブル作成
    const createEmailTableQuery = `
      CREATE TABLE IF NOT EXISTS "EmailSettings" (
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
    `

    const results = []

    // PaymentSettings テーブル作成
    try {
      console.log('🔄 Executing PaymentSettings table creation...')
      await prisma.$executeRawUnsafe(createPaymentTableQuery)
      results.push({ query: 'CREATE TABLE PaymentSettings', status: 'success' })
      console.log('✅ PaymentSettings table created successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ PaymentSettings table creation failed:', errorMsg)
      results.push({ query: 'CREATE TABLE PaymentSettings', status: 'error', error: errorMsg })
      
      // テーブルが既に存在する場合は無視
      if (!errorMsg.includes('already exists')) {
        console.error('🚨 Critical error creating PaymentSettings table')
      }
    }

    // EmailSettings テーブル作成
    try {
      console.log('🔄 Executing EmailSettings table creation...')
      await prisma.$executeRawUnsafe(createEmailTableQuery)
      results.push({ query: 'CREATE TABLE EmailSettings', status: 'success' })
      console.log('✅ EmailSettings table created successfully')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ EmailSettings table creation failed:', errorMsg)
      results.push({ query: 'CREATE TABLE EmailSettings', status: 'error', error: errorMsg })
      
      // テーブルが既に存在する場合は無視
      if (!errorMsg.includes('already exists')) {
        console.error('🚨 Critical error creating EmailSettings table')
      }
    }

    // デフォルト設定を作成
    console.log('🔄 Creating default payment settings...')
    try {
      const existingPaymentSettings = await prisma.paymentSettings.findFirst()
      
      if (!existingPaymentSettings) {
        const defaultPaymentSettings = await prisma.paymentSettings.create({
          data: {
            isTestMode: true,
            isActive: false,
            currency: 'jpy',
            enableCreditCard: false,
            enableBankTransfer: true,
            enableCashOnDelivery: true,
            creditCardFeeType: 'percentage',
            creditCardFeeRate: 3.6,
            creditCardFeeFixed: 0,
            bankTransferFee: 0,
            cashOnDeliveryFee: 330,
            creditCardFeeBearer: 'merchant',
            bankTransferFeeBearer: 'customer',
            cashOnDeliveryFeeBearer: 'customer'
          }
        })
        
        console.log('✅ Default payment settings created:', defaultPaymentSettings.id)
        results.push({ query: 'CREATE DEFAULT PAYMENT SETTINGS', status: 'success', id: defaultPaymentSettings.id })
      } else {
        console.log('✅ Payment settings already exist:', existingPaymentSettings.id)
        results.push({ query: 'CREATE DEFAULT PAYMENT SETTINGS', status: 'skipped', reason: 'already exists' })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Default payment settings creation failed:', errorMsg)
      results.push({ query: 'CREATE DEFAULT PAYMENT SETTINGS', status: 'error', error: errorMsg })
    }

    // デフォルトメール設定を作成
    console.log('🔄 Creating default email settings...')
    try {
      const existingEmailSettings = await prisma.emailSettings.findFirst()
      
      if (!existingEmailSettings) {
        const defaultEmailSettings = await prisma.emailSettings.create({
          data: {
            smtpHost: 'smtp.gmail.com',
            smtpPort: 587,
            fromName: 'CRM管理システム',
            isActive: false
          }
        })
        
        console.log('✅ Default email settings created:', defaultEmailSettings.id)
        results.push({ query: 'CREATE DEFAULT EMAIL SETTINGS', status: 'success', id: defaultEmailSettings.id })
      } else {
        console.log('✅ Email settings already exist:', existingEmailSettings.id)
        results.push({ query: 'CREATE DEFAULT EMAIL SETTINGS', status: 'skipped', reason: 'already exists' })
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ Default email settings creation failed:', errorMsg)
      results.push({ query: 'CREATE DEFAULT EMAIL SETTINGS', status: 'error', error: errorMsg })
    }

    console.log('✅ PaymentSettings and EmailSettings migration completed')

    return NextResponse.json({
      success: true,
      message: 'PaymentSettings and EmailSettings table migration completed',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ PaymentSettings migration failed:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}