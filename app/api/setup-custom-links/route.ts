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
    
    // CustomLinkテーブルが存在するか確認
    try {
      const count = await prisma.customLink.count()
      console.log(`CustomLink table exists with ${count} records`)
      
      return NextResponse.json({
        success: true,
        message: 'CustomLink table already exists',
        count
      })
    } catch (error: any) {
      console.log('CustomLink table check error:', error.message)
      
      // テーブルが存在しない場合、Prismaスキーマを同期
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        // PostgreSQLの場合、テーブルを作成
        try {
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
              PRIMARY KEY ("id")
            )
          `
          
          console.log('CustomLink table created successfully')
          
          return NextResponse.json({
            success: true,
            message: 'CustomLink table created successfully'
          })
        } catch (createError: any) {
          console.error('Error creating CustomLink table:', createError)
          return NextResponse.json({
            error: 'Failed to create CustomLink table',
            details: createError.message
          }, { status: 500 })
        }
      }
      
      return NextResponse.json({
        error: 'Database error',
        details: error.message
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Setup custom links error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}