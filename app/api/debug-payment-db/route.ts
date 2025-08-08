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

    console.log('🔍 Debug payment database API called')
    
    // 環境変数確認
    const hasDbUrl = !!process.env.DATABASE_URL
    console.log('DATABASE_URL exists:', hasDbUrl)
    
    if (!hasDbUrl) {
      return NextResponse.json({
        error: 'DATABASE_URL not found',
        hasDbUrl: false,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
    
    // Prismaクライアント確認
    let prismaError = null
    let dbConnectionOk = false
    let paymentSettingsExists = false
    let paymentSettingsCount = 0
    let samplePaymentSettings = null
    
    try {
      const prisma = getPrismaClient()
      if (!prisma) {
        throw new Error('Prisma client not initialized')
      }
      
      // PaymentSettingsテーブルの存在確認とデータ取得
      try {
        paymentSettingsCount = await prisma.paymentSettings.count()
        paymentSettingsExists = true
        dbConnectionOk = true
        
        // 設定データ取得
        samplePaymentSettings = await prisma.paymentSettings.findFirst({
          select: {
            id: true,
            stripePublicKey: true,
            isTestMode: true,
            isActive: true,
            currency: true,
            enableCreditCard: true,
            enableBankTransfer: true,
            enableCashOnDelivery: true,
            createdAt: true
          }
        })
        
      } catch (tableError) {
        console.error('PaymentSettings table error:', tableError)
        paymentSettingsExists = false
        // テーブル存在確認のための直接SQL実行
        try {
          await prisma.$queryRaw`SELECT 1 as test`
          dbConnectionOk = true
        } catch (connectionError) {
          dbConnectionOk = false
          prismaError = connectionError instanceof Error ? connectionError.message : String(connectionError)
        }
      }
      
    } catch (error) {
      prismaError = error instanceof Error ? error.message : String(error)
    }
    
    return NextResponse.json({
      status: 'debug complete',
      hasDbUrl,
      dbConnectionOk,
      paymentSettingsExists,
      paymentSettingsCount,
      samplePaymentSettings,
      prismaError,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Debug payment DB API error:', error)
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}