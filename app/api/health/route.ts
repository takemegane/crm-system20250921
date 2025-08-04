import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient, isPrismaInitialized } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // 基本的な環境確認
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database_url_exists: !!process.env.DATABASE_URL,
      prisma_initialized: isPrismaInitialized(),
      environment: process.env.NODE_ENV || 'unknown'
    }
    
    console.log('Health check - Prisma initialized:', isPrismaInitialized())

    // データベース接続テスト（動的初期化）
    const prismaClient = getPrismaClient()
    if (prismaClient) {
      try {
        await prismaClient.$connect()
        const testQuery = await prismaClient.$queryRaw`SELECT 1 as test`
        health.database_connection = 'ok'
        health.test_query = 'ok'
      } catch (error) {
        health.database_connection = 'error'
        health.database_error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        await prismaClient.$disconnect()
      }
    } else {
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