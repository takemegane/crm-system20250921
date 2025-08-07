import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
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

    // Get payment settings
    const settings = await prisma.paymentSettings.findFirst()

    if (!settings || !settings.isActive) {
      return NextResponse.json({ error: '決済設定が無効になっています' }, { status: 400 })
    }

    if (!settings.stripeSecretKey) {
      return NextResponse.json({ error: 'Stripe Secret Keyが設定されていません' }, { status: 400 })
    }

    // Test Stripe connection
    try {
      // Dynamic import to avoid bundling Stripe in build
      const Stripe = require('stripe')
      const stripe = new Stripe(settings.stripeSecretKey, {
        apiVersion: '2023-10-16'
      })

      // Test API call - retrieve account information
      const account = await stripe.accounts.retrieve()
      
      console.log('Stripe connection test successful:', {
        id: account.id,
        email: account.email,
        country: account.country,
        testMode: settings.isTestMode
      })

      return NextResponse.json({ 
        message: '接続テストに成功しました',
        details: {
          accountId: account.id,
          email: account.email,
          country: account.country,
          testMode: settings.isTestMode
        }
      })
    } catch (stripeError: any) {
      console.error('Stripe connection test failed:', stripeError)
      return NextResponse.json(
        { error: `Stripe接続に失敗しました: ${stripeError.message}` },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error testing payment connection:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}