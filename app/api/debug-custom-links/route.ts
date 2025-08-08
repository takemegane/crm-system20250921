import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // OWNER権限のみ実行可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }
    
    console.log('Debug: Checking CustomLink table status...')
    
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing',
      session: session ? 'authenticated' : 'not authenticated',
      userRole: session?.user?.role || 'none'
    }
    
    // データベース接続テスト
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      debugInfo.databaseConnection = 'success'
    } catch (error: any) {
      debugInfo.databaseConnection = 'failed'
      debugInfo.databaseError = error.message
    }
    
    // CustomLinkテーブル存在確認
    try {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'CustomLink'
        ) as exists
      ` as any[]
      
      debugInfo.customLinkTableExists = tableExists[0]?.exists || false
      
      if (debugInfo.customLinkTableExists) {
        try {
          const count = await prisma.customLink.count()
          debugInfo.customLinkRecordCount = count
        } catch (countError: any) {
          debugInfo.customLinkCountError = countError.message
        }
      }
    } catch (error: any) {
      debugInfo.tableCheckError = error.message
      debugInfo.tableCheckCode = error.code
    }
    
    // 全テーブル一覧取得
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      ` as any[]
      
      debugInfo.existingTables = tables.map(t => t.table_name)
    } catch (error: any) {
      debugInfo.tablesListError = error.message
    }
    
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2))
    
    return NextResponse.json({
      success: true,
      debug: debugInfo
    })
    
  } catch (error) {
    console.error('Debug custom links error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}