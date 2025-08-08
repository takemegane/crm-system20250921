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

    console.log('🔍 Debug all errors API called')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    const debugResults = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    }

    // 1. PaymentSettings テーブルテスト
    try {
      const paymentSettingsCount = await prisma.paymentSettings.count()
      const paymentSample = await prisma.paymentSettings.findFirst()
      debugResults.tests.push({
        name: 'PaymentSettings Table',
        status: 'success',
        count: paymentSettingsCount,
        sample: paymentSample ? { id: paymentSample.id, isActive: paymentSample.isActive } : null
      })
    } catch (error) {
      debugResults.tests.push({
        name: 'PaymentSettings Table',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 2. EmailSettings テーブルテスト
    try {
      const emailSettingsCount = await prisma.emailSettings.count()
      const emailSample = await prisma.emailSettings.findFirst()
      debugResults.tests.push({
        name: 'EmailSettings Table',
        status: 'success',
        count: emailSettingsCount,
        sample: emailSample ? { id: emailSample.id, isActive: emailSample.isActive } : null
      })
    } catch (error) {
      debugResults.tests.push({
        name: 'EmailSettings Table',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 3. Order テーブル（決済ログ用）テスト
    try {
      const orderCount = await prisma.order.count()
      debugResults.tests.push({
        name: 'Order Table (Payment Logs)',
        status: 'success',
        count: orderCount
      })
    } catch (error) {
      debugResults.tests.push({
        name: 'Order Table (Payment Logs)',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 4. 権限システムテスト
    try {
      const { hasPermission } = require('@/lib/permissions')
      const hasPaymentLogsPermission = hasPermission(session.user.role, 'VIEW_PAYMENT_LOGS')
      const hasPaymentSettingsPermission = hasPermission(session.user.role, 'MANAGE_PAYMENT_SETTINGS')
      const hasEmailSettingsPermission = hasPermission(session.user.role, 'MANAGE_EMAIL_SETTINGS')
      
      debugResults.tests.push({
        name: 'Permissions System',
        status: 'success',
        userRole: session.user.role,
        permissions: {
          VIEW_PAYMENT_LOGS: hasPaymentLogsPermission,
          MANAGE_PAYMENT_SETTINGS: hasPaymentSettingsPermission,
          MANAGE_EMAIL_SETTINGS: hasEmailSettingsPermission
        }
      })
    } catch (error) {
      debugResults.tests.push({
        name: 'Permissions System',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // 5. 各APIエンドポイントのテスト（内部呼び出し）
    try {
      // PaymentSettings API テスト
      const paymentSettingsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/payment-settings`, {
        headers: {
          'Cookie': `next-auth.session-token=${session}`
        }
      })
      
      debugResults.tests.push({
        name: 'Payment Settings API',
        status: paymentSettingsResponse.ok ? 'success' : 'error',
        httpStatus: paymentSettingsResponse.status,
        error: paymentSettingsResponse.ok ? null : await paymentSettingsResponse.text()
      })
    } catch (error) {
      debugResults.tests.push({
        name: 'Payment Settings API',
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }

    return NextResponse.json(debugResults)
    
  } catch (error) {
    console.error('Debug all errors API error:', error)
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}