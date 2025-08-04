import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // 基本的な環境確認
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database_url_exists: !!process.env.DATABASE_URL,
      prisma_initialized: !!prisma,
      environment: process.env.NODE_ENV || 'unknown'
    }

    // データベース接続テスト
    if (prisma) {
      try {
        await prisma!.$connect()
        const testQuery = await prisma!.$queryRaw`SELECT 1 as test`
        health.database_connection = 'ok'
        health.test_query = 'ok'
      } catch (error) {
        health.database_connection = 'error'
        health.database_error = error instanceof Error ? error.message : 'Unknown error'
      } finally {
        await prisma!.$disconnect()
      }
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