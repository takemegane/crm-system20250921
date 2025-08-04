import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL環境変数が設定されていません' },
        { status: 503 }
      )
    }

    console.log('Starting database setup...')

    // データベース接続テスト
    try {
      await prisma.$connect()
      console.log('Database connection successful')
    } catch (error) {
      console.error('Database connection failed:', error)
      return NextResponse.json(
        { error: `データベース接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 503 }
      )
    }

    // テーブル存在確認とスキーマ同期
    try {
      // 簡単なクエリでテーブル存在を確認
      await prisma.$queryRaw`SELECT 1`
      console.log('Database query test successful')

      // テーブル作成 (CREATE TABLE IF NOT EXISTS相当)
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "User" (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'ADMIN',
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "Customer" (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          "nameKana" TEXT,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          address TEXT,
          "birthDate" TIMESTAMP,
          gender TEXT,
          password TEXT,
          "isECUser" BOOLEAN DEFAULT FALSE,
          "joinedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "isArchived" BOOLEAN DEFAULT FALSE,
          "archivedAt" TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `

      console.log('Database tables created successfully')

      return NextResponse.json(
        { 
          message: 'データベースセットアップが完了しました',
          details: '基本テーブルが作成されました'
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('Database setup error:', error)
      return NextResponse.json(
        { error: `データベースセットアップエラー: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: `セットアップエラー: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}