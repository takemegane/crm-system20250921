import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

export async function POST(request: NextRequest) {
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
    
    console.log('Fixing CustomLink table in production...')
    
    try {
      // PostgreSQLでCustomLinkテーブルを作成
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "CustomLink" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "icon" TEXT DEFAULT '🔗',
          "sortOrder" INTEGER DEFAULT 0,
          "isActive" BOOLEAN DEFAULT true,
          "isExternal" BOOLEAN DEFAULT true,
          "openInNewTab" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "CustomLink_pkey" PRIMARY KEY ("id")
        )
      `
      
      console.log('CustomLink table created successfully')
      
      // インデックスを作成
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "CustomLink_sortOrder_idx" ON "CustomLink"("sortOrder")
      `
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS "CustomLink_isActive_idx" ON "CustomLink"("isActive")
      `
      
      console.log('Indexes created successfully')
      
      // テーブルが正常に作成されたか確認
      const count = await prisma.customLink.count()
      
      return NextResponse.json({
        success: true,
        message: 'CustomLink table and indexes created successfully',
        recordCount: count
      })
      
    } catch (error: any) {
      console.error('Table creation error:', error)
      
      // エラーの詳細をログ出力
      if (error.code) {
        console.error('Error code:', error.code)
      }
      if (error.meta) {
        console.error('Error meta:', error.meta)
      }
      
      return NextResponse.json({
        error: 'Failed to create CustomLink table',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Fix custom links table error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}