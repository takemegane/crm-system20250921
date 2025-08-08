import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient, resetPrismaClient } from '@/lib/db'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    // オーナーのみアクセス可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    console.log('🔄 Starting complete connection reset...')
    const results = []

    // 1. 現在のPrismaクライアントを切断
    try {
      const prisma = getPrismaClient()
      if (prisma) {
        await prisma.$disconnect()
        console.log('✅ Prisma client disconnected')
      }
      results.push({ step: 'DISCONNECT_PRISMA', status: 'success' })
    } catch (error) {
      console.error('❌ Prisma disconnect failed:', error)
      results.push({ step: 'DISCONNECT_PRISMA', status: 'error', error: String(error) })
    }

    // 2. Prismaクライアントをリセット
    try {
      await resetPrismaClient()
      console.log('✅ Prisma client reset')
      results.push({ step: 'RESET_PRISMA_CLIENT', status: 'success' })
    } catch (error) {
      console.error('❌ Prisma reset failed:', error)
      results.push({ step: 'RESET_PRISMA_CLIENT', status: 'error', error: String(error) })
    }

    // 3. 新しいクライアントで接続テスト
    try {
      const newPrisma = getPrismaClient()
      if (!newPrisma) {
        throw new Error('Failed to get new Prisma client')
      }

      // 簡単なクエリで接続確認
      await newPrisma.$queryRaw`SELECT 1 as test`
      console.log('✅ New connection established')
      results.push({ step: 'TEST_NEW_CONNECTION', status: 'success' })
    } catch (error) {
      console.error('❌ New connection test failed:', error)
      results.push({ step: 'TEST_NEW_CONNECTION', status: 'error', error: String(error) })
    }

    // 4. EmailSettingsテーブルを再作成
    try {
      const prisma = getPrismaClient()
      
      console.log('🗑️ Dropping EmailSettings table...')
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "EmailSettings";`)
      
      console.log('📧 Recreating EmailSettings table...')
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
      
      console.log('⚙️ Inserting default EmailSettings...')
      await prisma.$executeRawUnsafe(`
        INSERT INTO "EmailSettings" (
          "id", "smtpHost", "smtpPort", "fromName", "isActive"
        ) VALUES (
          $1, 'smtp.gmail.com', 587, 'CRM管理システム', false
        );
      `, [`email-settings-${Date.now()}`])
      
      results.push({ step: 'RECREATE_EMAIL_SETTINGS', status: 'success' })
      console.log('✅ EmailSettings recreated successfully')
      
    } catch (error) {
      console.error('❌ EmailSettings recreation failed:', error)
      results.push({ step: 'RECREATE_EMAIL_SETTINGS', status: 'error', error: String(error) })
    }

    // 5. 最終的な接続リセット
    try {
      const prisma = getPrismaClient()
      await prisma.$disconnect()
      await resetPrismaClient()
      results.push({ step: 'FINAL_RESET', status: 'success' })
      console.log('✅ Final connection reset completed')
    } catch (error) {
      console.error('❌ Final reset failed:', error)
      results.push({ step: 'FINAL_RESET', status: 'error', error: String(error) })
    }

    console.log('✅ Complete connection reset finished')

    return NextResponse.json({
      success: true,
      message: 'All connections and cached plans reset successfully',
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Connection reset failed:', error)
    return NextResponse.json({
      error: 'Connection reset failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}