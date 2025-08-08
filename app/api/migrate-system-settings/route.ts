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

    console.log('🔄 Starting SystemSettings table migration...')

    // PostgreSQL の直接SQLを実行してカラムを追加
    const alterQueries = [
      `ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "dashboardWidgets" JSONB DEFAULT '[]'::jsonb;`,
      `ALTER TABLE "SystemSettings" ADD COLUMN IF NOT EXISTS "menuLinks" JSONB DEFAULT '[]'::jsonb;`
    ]

    const results = []
    for (const query of alterQueries) {
      try {
        console.log(`🔄 Executing: ${query}`)
        await prisma.$executeRawUnsafe(query)
        results.push({ query, status: 'success' })
        console.log(`✅ Query executed successfully`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`❌ Query failed: ${errorMsg}`)
        results.push({ query, status: 'error', error: errorMsg })
        
        // カラムが既に存在する場合は無視
        if (!errorMsg.includes('already exists')) {
          throw error
        }
      }
    }

    // 既存のSystemSettings レコードを確認・更新
    console.log('🔄 Updating existing SystemSettings records...')
    const existingSettings = await prisma.systemSettings.findMany()
    
    let updateCount = 0
    for (const setting of existingSettings) {
      try {
        await prisma.systemSettings.update({
          where: { id: setting.id },
          data: {
            dashboardWidgets: setting.dashboardWidgets || [],
            menuLinks: setting.menuLinks || []
          }
        })
        updateCount++
      } catch (error) {
        console.error('❌ Failed to update setting:', error)
      }
    }

    console.log('✅ SystemSettings migration completed')

    return NextResponse.json({
      success: true,
      message: 'SystemSettings table migration completed',
      results,
      updatedRecords: updateCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}