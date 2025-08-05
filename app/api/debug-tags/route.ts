import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🔍 Tag API debug started')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client is null')
      return NextResponse.json(
        { error: 'Prismaクライアントが初期化されていません', debug: 'PRISMA_NULL' },
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Prisma client obtained')

    // データベース接続テスト
    try {
      await prisma.$connect()
      console.log('✅ Database connection successful')
    } catch (connectError) {
      console.log('❌ Database connection failed:', connectError)
      return NextResponse.json(
        { 
          error: 'データベース接続エラー', 
          debug: 'DB_CONNECTION_FAILED',
          details: connectError instanceof Error ? connectError.message : String(connectError)
        },
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Tagテーブル確認
    try {
      console.log('🔍 Checking Tag table...')
      const tagCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Tag"`
      console.log('✅ Tag table accessible, count query result:', tagCount)
    } catch (tableError) {
      console.log('❌ Tag table access error:', tableError)
      return NextResponse.json(
        { 
          error: 'Tagテーブルアクセスエラー', 
          debug: 'TABLE_ACCESS_FAILED',
          details: tableError instanceof Error ? tableError.message : String(tableError)
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 実際のTagデータ取得
    try {
      console.log('🔍 Fetching Tag data...')
      const tags = await prisma.tag.findMany({
        select: {
          id: true,
          name: true,
          color: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      console.log('✅ Tag data fetched successfully:', tags.length, 'records')
      
      return NextResponse.json({
        success: true,
        debug: 'TAG_FETCH_SUCCESS',
        count: tags.length,
        data: tags
      }, {
        headers: { 'Content-Type': 'application/json' }
      })

    } catch (fetchError) {
      console.log('❌ Tag data fetch error:', fetchError)
      return NextResponse.json(
        { 
          error: 'Tagデータ取得エラー', 
          debug: 'DATA_FETCH_FAILED',
          details: fetchError instanceof Error ? fetchError.message : String(fetchError),
          stack: fetchError instanceof Error ? fetchError.stack : undefined
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.log('❌ Unexpected error in debug API:', error)
    return NextResponse.json(
      { 
        error: '予期しないエラー', 
        debug: 'UNEXPECTED_ERROR',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } finally {
    const prisma = getPrismaClient()
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}