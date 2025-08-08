import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

export async function GET() {
  try {
    console.log('🔍 Debug system settings API called')
    
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
    let settingsCount = 0
    let sampleSettings = null
    
    try {
      const prisma = getPrismaClient()
      if (!prisma) {
        throw new Error('Prisma client not initialized')
      }
      
      // 簡単なクエリテスト
      settingsCount = await prisma.systemSettings.count()
      dbConnectionOk = true
      
      // 設定データ取得
      sampleSettings = await prisma.systemSettings.findFirst({
        where: { isActive: true },
        select: {
          systemName: true,
          logoUrl: true,
          primaryColor: true,
          dashboardWidgets: true,
          menuLinks: true,
          isActive: true
        }
      })
      
    } catch (error) {
      prismaError = error instanceof Error ? error.message : String(error)
    }
    
    return NextResponse.json({
      status: 'debug complete',
      hasDbUrl,
      dbConnectionOk,
      prismaError,
      settingsCount,
      sampleSettings,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}