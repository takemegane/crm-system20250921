import { NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🔍 Debug categories API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        error: 'DATABASE_URL not available',
        step: 'environment_check'
      }, { status: 503 })
    }

    // Prismaクライアント確認
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ 
        error: 'Prisma client not initialized',
        step: 'prisma_check'
      }, { status: 503 })
    }

    const debug = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database_url_exists: true,
      prisma_initialized: true,
      tests: {}
    }

    // 1. データベース接続テスト
    try {
      await prisma.$connect()
      debug.tests.database_connection = 'success'
    } catch (error) {
      debug.tests.database_connection = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      }
      return NextResponse.json(debug, { status: 500 })
    }

    // 2. 基本クエリテスト
    try {
      await prisma.$queryRaw`SELECT 1 as test`
      debug.tests.basic_query = 'success'
    } catch (error) {
      debug.tests.basic_query = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      }
    }

    // 3. Categoryテーブル存在確認
    try {
      const tableInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'Category'
        ORDER BY ordinal_position
      `
      debug.tests.category_table_structure = {
        status: 'success',
        columns: tableInfo
      }
    } catch (error) {
      debug.tests.category_table_structure = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      }
    }

    // 4. 既存カテゴリ取得テスト
    try {
      const categories = await prisma.category.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          sortOrder: true
        }
      })
      debug.tests.category_read = {
        status: 'success',
        count: categories.length,
        data: categories
      }
    } catch (error) {
      debug.tests.category_read = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      }
    }

    // 5. カテゴリ作成テスト（テスト用データ）
    try {
      // テスト用カテゴリが既に存在するかチェック
      const existingTest = await prisma.category.findFirst({
        where: { name: 'DEBUG_TEST_CATEGORY' }
      })

      if (existingTest) {
        debug.tests.category_create_test = {
          status: 'skipped',
          message: 'Test category already exists',
          existing_id: existingTest.id
        }
      } else {
        const testCategory = await prisma.category.create({
          data: {
            name: 'DEBUG_TEST_CATEGORY',
            description: 'This is a test category for debugging',
            isActive: true,
            sortOrder: 999
          }
        })
        
        debug.tests.category_create_test = {
          status: 'success',
          created_id: testCategory.id,
          created_name: testCategory.name
        }

        // 作成直後に削除
        await prisma.category.delete({
          where: { id: testCategory.id }
        })
        
        debug.tests.category_cleanup = 'success'
      }
    } catch (error) {
      debug.tests.category_create_test = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }

    // 6. SystemSettingsテーブル状態確認
    try {
      const systemSettings = await prisma.systemSettings.findFirst()
      debug.tests.system_settings = {
        status: 'success',
        exists: !!systemSettings,
        id: systemSettings?.id || null
      }
    } catch (error) {
      debug.tests.system_settings = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error)
      }
    }

    await prisma.$disconnect()

    return NextResponse.json(debug, {
      headers: {
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Debug API failed',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}