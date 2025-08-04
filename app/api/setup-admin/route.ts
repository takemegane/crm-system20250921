import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  console.log('=== Setup Admin API called ===')
  
  try {
    // 基本的な情報をログ出力
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 50) + '...')
    console.log('Prisma client exists:', !!prisma)

    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('ERROR: DATABASE_URL not found')
      return NextResponse.json(
        { error: 'DATABASE_URL環境変数が設定されていません' },
        { status: 503 }
      )
    }

    // Prismaクライアントの存在確認
    if (!prisma) {
      console.log('ERROR: Prisma client not initialized')
      return NextResponse.json(
        { error: 'Prismaクライアントが初期化されていません' },
        { status: 503 }
      )
    }

    console.log('Starting database operations...')

    // 最初に簡単なテストを実行
    console.log('Testing basic database connection...')
    try {
      // 基本的な接続テスト
      await prisma!.$connect()
      console.log('✅ Database connection successful')
      
      // シンプルなクエリテスト
      const testQuery = await prisma!.$queryRaw`SELECT 1 as test`
      console.log('✅ Basic query successful:', testQuery)
    } catch (error) {
      console.error('❌ Database connection or query failed:', error)
      return NextResponse.json(
        { 
          error: `データベース接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: 'Basic connection test failed'
        },
        { status: 503 }
      )
    }

    // ユーザーテーブルの存在確認（簡易版）
    console.log('Checking if User table exists...')
    let userTableExists = false
    try {
      await prisma!.$queryRaw`SELECT 1 FROM "User" LIMIT 1`
      userTableExists = true
      console.log('✅ User table exists')
    } catch (error) {
      console.log('⚠️ User table does not exist, will create it')
      userTableExists = false
    }

    // テーブルが存在しない場合は作成
    if (!userTableExists) {
      console.log('Creating User table...')
      try {
        await prisma!.$executeRaw`
          CREATE TABLE IF NOT EXISTS "User" (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'OWNER',
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
        console.log('✅ User table created successfully')
      } catch (createError) {
        console.error('❌ Failed to create User table:', createError)
        return NextResponse.json(
          { 
            error: `ユーザーテーブルの作成に失敗: ${createError instanceof Error ? createError.message : 'Unknown error'}`,
            details: 'Table creation failed'
          },
          { status: 500 }
        )
      }
    }

    // 既存の管理者をチェック
    const existingAdmin = await prisma!.user.findFirst({
      where: { role: 'OWNER' }
    }).catch((error) => {
      console.error('Database query error:', error)
      throw new Error(`データベースクエリエラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
    })

    if (existingAdmin) {
      return NextResponse.json(
        { error: '管理者アカウントは既に存在します' },
        { status: 400 }
      )
    }

    // デフォルト管理者アカウントを作成
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const admin = await prisma!.user.create({
      data: {
        id: 'admin001',
        email: 'admin@example.com',
        name: 'システム管理者',
        password: hashedPassword,
        role: 'OWNER'
      }
    }).catch((error) => {
      console.error('Database creation error:', error)
      throw new Error('データベースへの保存に失敗しました')
    })

    return NextResponse.json(
      { 
        message: '管理者アカウントが作成されました',
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Critical error in setup-admin:', error)
    
    // 確実にJSONレスポンスを返す
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error details:', errorMessage)
    
    return NextResponse.json(
      { 
        error: 'アカウントの作成に失敗しました',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  } finally {
    // 確実にデータベース接続を切断
    try {
      await prisma!.$disconnect()
      console.log('Database disconnected')
    } catch (disconnectError) {
      console.error('Disconnect error:', disconnectError)
    }
  }
}