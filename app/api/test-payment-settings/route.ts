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
    console.log('🔍 Test payment settings API called')
    
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
      return NextResponse.json({ 
        error: 'Unauthorized',
        session: session ? { role: session.user.role } : null 
      }, { status: 401 })
    }

    console.log('✅ Authorization passed, fetching payment settings...')

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

    console.log('💳 Payment settings found:', settings ? 'YES' : 'NO')

    return NextResponse.json({
      success: true,
      message: 'Test payment settings API working',
      settings: settings,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Test payment settings API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}