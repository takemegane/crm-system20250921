import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PAYMENT_SETTINGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current payment settings (only one record should exist)
    let settings = await prisma.paymentSettings.findFirst({
      select: {
        id: true,
        stripePublicKey: true,
        isTestMode: true,
        isActive: true,
        currency: true,
        
        // 支払い方法表示制御
        enableCreditCard: true,
        enableBankTransfer: true,
        enableCashOnDelivery: true,
        
        // 手数料設定
        creditCardFeeType: true,
        creditCardFeeRate: true,
        creditCardFeeFixed: true,
        bankTransferFee: true,
        cashOnDeliveryFee: true,
        
        // 手数料負担者設定
        creditCardFeeBearer: true,
        bankTransferFeeBearer: true,
        cashOnDeliveryFeeBearer: true,
        
        createdAt: true,
        updatedAt: true
        // Don't return stripeSecretKey or stripeWebhookSecret for security
      }
    })

    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.paymentSettings.create({
        data: {
          isTestMode: true,
          isActive: false,
          currency: 'jpy',
          // デフォルト支払い方法設定
          enableCreditCard: false,
          enableBankTransfer: true,
          enableCashOnDelivery: true,
          // デフォルト手数料設定
          creditCardFeeType: 'percentage',
          creditCardFeeRate: 3.6,
          creditCardFeeFixed: 0,
          bankTransferFee: 0,
          cashOnDeliveryFee: 330,
          // デフォルト手数料負担者設定
          creditCardFeeBearer: 'merchant',
          bankTransferFeeBearer: 'customer',
          cashOnDeliveryFeeBearer: 'customer'
        },
        select: {
          id: true,
          stripePublicKey: true,
          isTestMode: true,
          isActive: true,
          currency: true,
          enableCreditCard: true,
          enableBankTransfer: true,
          enableCashOnDelivery: true,
          creditCardFeeType: true,
          creditCardFeeRate: true,
          creditCardFeeFixed: true,
          bankTransferFee: true,
          cashOnDeliveryFee: true,
          creditCardFeeBearer: true,
          bankTransferFeeBearer: true,
          cashOnDeliveryFeeBearer: true,
          createdAt: true,
          updatedAt: true
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PAYMENT_SETTINGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      stripePublicKey, stripeSecretKey, stripeWebhookSecret, isTestMode, isActive, currency,
      // 支払い方法表示制御
      enableCreditCard, enableBankTransfer, enableCashOnDelivery,
      // 手数料設定
      creditCardFeeType, creditCardFeeRate, creditCardFeeFixed,
      bankTransferFee, cashOnDeliveryFee,
      // 手数料負担者設定
      creditCardFeeBearer, bankTransferFeeBearer, cashOnDeliveryFeeBearer
    } = body

    // Stripe設定チェック（isActiveがtrueに設定されるときのみ）
    if (isActive === true && !stripePublicKey) {
      return NextResponse.json(
        { error: 'Stripe Public Key is required when payment is active' },
        { status: 400 }
      )
    }

    // Get or create settings
    const existingSettings = await prisma.paymentSettings.findFirst()

    const updateData: any = {}

    // Stripe設定（これらのフィールドが送信された場合のみ更新）
    if (stripePublicKey !== undefined) {
      updateData.stripePublicKey = stripePublicKey || null
    }
    if (isTestMode !== undefined) {
      updateData.isTestMode = Boolean(isTestMode)
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }
    if (currency !== undefined) {
      updateData.currency = currency || 'jpy'
    }
    
    // 支払い方法表示制御（これらのフィールドが送信された場合のみ更新）
    if (enableCreditCard !== undefined) {
      updateData.enableCreditCard = Boolean(enableCreditCard)
    }
    if (enableBankTransfer !== undefined) {
      updateData.enableBankTransfer = Boolean(enableBankTransfer)
    }
    if (enableCashOnDelivery !== undefined) {
      updateData.enableCashOnDelivery = Boolean(enableCashOnDelivery)
    }
    
    // 手数料設定（これらのフィールドが送信された場合のみ更新）
    if (creditCardFeeType !== undefined) {
      updateData.creditCardFeeType = creditCardFeeType || 'percentage'
    }
    if (creditCardFeeRate !== undefined) {
      updateData.creditCardFeeRate = parseFloat(creditCardFeeRate) || 0
    }
    if (creditCardFeeFixed !== undefined) {
      updateData.creditCardFeeFixed = parseFloat(creditCardFeeFixed) || 0
    }
    if (bankTransferFee !== undefined) {
      updateData.bankTransferFee = parseFloat(bankTransferFee) || 0
    }
    if (cashOnDeliveryFee !== undefined) {
      updateData.cashOnDeliveryFee = parseFloat(cashOnDeliveryFee) || 0
    }
    
    // 手数料負担者設定（これらのフィールドが送信された場合のみ更新）
    if (creditCardFeeBearer !== undefined) {
      updateData.creditCardFeeBearer = creditCardFeeBearer || 'merchant'
    }
    if (bankTransferFeeBearer !== undefined) {
      updateData.bankTransferFeeBearer = bankTransferFeeBearer || 'customer'
    }
    if (cashOnDeliveryFeeBearer !== undefined) {
      updateData.cashOnDeliveryFeeBearer = cashOnDeliveryFeeBearer || 'customer'
    }

    // Only update secrets if provided
    if (stripeSecretKey) {
      // TODO: In production, encrypt this before storing
      updateData.stripeSecretKey = stripeSecretKey
    }

    if (stripeWebhookSecret) {
      // TODO: In production, encrypt this before storing
      updateData.stripeWebhookSecret = stripeWebhookSecret
    }

    let responseSettings
    if (existingSettings) {
      // Update existing settings
      responseSettings = await prisma.paymentSettings.update({
        where: { id: existingSettings.id },
        data: updateData,
        select: {
          id: true,
          stripePublicKey: true,
          isTestMode: true,
          isActive: true,
          currency: true,
          enableCreditCard: true,
          enableBankTransfer: true,
          enableCashOnDelivery: true,
          creditCardFeeType: true,
          creditCardFeeRate: true,
          creditCardFeeFixed: true,
          bankTransferFee: true,
          cashOnDeliveryFee: true,
          creditCardFeeBearer: true,
          bankTransferFeeBearer: true,
          cashOnDeliveryFeeBearer: true,
          createdAt: true,
          updatedAt: true
        }
      })
    } else {
      // Create new settings with defaults for required fields
      const createData = {
        // デフォルト値
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
        cashOnDeliveryFeeBearer: 'customer',
        // 送信された値で上書き
        ...updateData
      }
      responseSettings = await prisma.paymentSettings.create({
        data: createData,
        select: {
          id: true,
          stripePublicKey: true,
          isTestMode: true,
          isActive: true,
          currency: true,
          enableCreditCard: true,
          enableBankTransfer: true,
          enableCashOnDelivery: true,
          creditCardFeeType: true,
          creditCardFeeRate: true,
          creditCardFeeFixed: true,
          bankTransferFee: true,
          cashOnDeliveryFee: true,
          creditCardFeeBearer: true,
          bankTransferFeeBearer: true,
          cashOnDeliveryFeeBearer: true,
          createdAt: true,
          updatedAt: true
        }
      })
    }

    return NextResponse.json(responseSettings)
  } catch (error) {
    console.error('Error updating payment settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}