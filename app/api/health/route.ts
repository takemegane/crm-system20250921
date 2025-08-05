import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient, isPrismaInitialized } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🏥 Health check started')
    console.log('🏥 Environment:', process.env.NODE_ENV)
    console.log('🏥 DATABASE_URL exists:', !!process.env.DATABASE_URL)
    
    // 基本的な環境確認
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database_url_exists: !!process.env.DATABASE_URL,
      prisma_initialized: isPrismaInitialized(),
      environment: process.env.NODE_ENV || 'unknown'
    }
    
    console.log('🏥 isPrismaInitialized result:', isPrismaInitialized())

    // データベース接続テスト（動的初期化）
    console.log('🏥 Attempting to get Prisma client...')
    const prismaClient = getPrismaClient()
    console.log('🏥 Prisma client result:', !!prismaClient)
    
    if (prismaClient) {
      try {
        console.log('🏥 Attempting database connection...')
        await prismaClient.$connect()
        console.log('🏥 Database connection successful')
        
        console.log('🏥 Executing test query...')
        const testQuery = await prismaClient.$queryRaw`SELECT 1 as test`
        console.log('🏥 Test query result:', testQuery)
        
        health.database_connection = 'ok'
        health.test_query = 'ok'

        // カテゴリテーブル診断
        console.log('🏥 Testing Category table...')
        try {
          const categoryCount = await prismaClient.category.count()
          console.log('🏥 Category count:', categoryCount)
          health.category_table = 'ok'
          health.category_count = categoryCount
          
          // カテゴリ作成テスト
          console.log('🏥 Testing category creation...')
          const testCategoryName = `HEALTH_TEST_${Date.now()}`
          const testCategory = await prismaClient.category.create({
            data: {
              name: testCategoryName,
              description: 'Health check test category',
              isActive: true,
              sortOrder: 999
            }
          })
          console.log('🏥 Test category created:', testCategory.id)
          
          // 作成したテストカテゴリを削除
          await prismaClient.category.delete({
            where: { id: testCategory.id }
          })
          console.log('🏥 Test category cleaned up')
          
          health.category_create_test = 'ok'
        } catch (categoryError) {
          console.error('🏥 Category test failed:', categoryError)
          health.category_table = 'error'
          health.category_error = categoryError instanceof Error ? categoryError.message : 'Unknown category error'
        }
      } catch (error) {
        console.error('🏥 Database operation failed:', error)
        health.database_connection = 'error'
        health.database_error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        console.log('🏥 Disconnecting from database...')
        await prismaClient.$disconnect()
      }
    } else {
      console.log('🏥 Prisma client is null - not initialized')
      health.database_connection = 'not_initialized'
    }

    return NextResponse.json(health, {
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}