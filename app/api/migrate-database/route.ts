import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Database migration API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    // 認証とOWNER権限チェック（重要なDB操作のため）
    const session = await getServerSession(authOptions)
    console.log('👤 Session user:', session?.user?.email || 'No session', 'role:', session?.user?.role)
    
    if (!session || session.user.role !== 'OWNER') {
      console.log('❌ Permission denied - OWNER role required for database migration')
      return NextResponse.json({ error: 'OWNER権限が必要です' }, { status: 403 })
    }
    
    console.log('✅ OWNER permission confirmed')

    // PostgreSQLの直接実行でcategoryTypeフィールドを追加
    console.log('🔄 Adding categoryType field to Category table...')
    
    try {
      // categoryTypeフィールドが既に存在するかチェック
      const checkResult = await prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = 'categoryType'
      ` as any[]
      
      console.log('🔍 categoryType field check result:', checkResult.length)

      if (checkResult.length === 0) {
        // フィールドが存在しない場合は追加
        console.log('➕ Adding categoryType field...')
        await prisma.$executeRaw`
          ALTER TABLE "Category" 
          ADD COLUMN "categoryType" TEXT NOT NULL DEFAULT 'PHYSICAL'
        `
        console.log('✅ categoryType field added successfully')

        // 既存データを適切な種別に更新（デジタル関連は'DIGITAL'に設定）
        console.log('🔄 Updating existing categories...')
        await prisma.$executeRaw`
          UPDATE "Category" 
          SET "categoryType" = 'DIGITAL' 
          WHERE "name" ILIKE '%デジタル%' 
             OR "name" ILIKE '%オンライン%' 
             OR "name" ILIKE '%PDF%'
             OR "name" ILIKE '%動画%'
             OR "name" ILIKE '%ダウンロード%'
        `
        console.log('✅ Category types updated')
      } else {
        console.log('ℹ️ categoryType field already exists')
      }

    } catch (error) {
      console.error('❌ Error during field addition:', error)
      return NextResponse.json({
        error: 'Migration failed',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

    // マイグレーション後の確認
    console.log('🔍 Verifying migration...')
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        categoryType: true,
        isActive: true
      }
    })
    
    console.log('📊 Categories after migration:', categories.length)
    categories.forEach(c => {
      console.log(`  - ${c.name}: ${c.categoryType}`)
    })

    console.log('🎉 Database migration completed successfully')
    return NextResponse.json({
      message: 'データベースマイグレーションが完了しました',
      migrated: true,
      categoriesCount: categories.length,
      categories: categories.map(c => ({
        name: c.name,
        categoryType: c.categoryType,
        isActive: c.isActive
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error during database migration:', error)
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    console.log('🔍 Migration status check')
    
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    // categoryTypeフィールドの存在確認
    try {
      const checkResult = await prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = 'categoryType'
      ` as any[]
      
      const categoryTypeExists = checkResult.length > 0
      
      // 既存カテゴリの確認（フィールドが存在する場合のみ）
      let categories: any[] = []
      if (categoryTypeExists) {
        categories = await prisma.category.findMany({
          select: {
            name: true,
            categoryType: true,
            isActive: true
          }
        })
      }

      return NextResponse.json({
        categoryTypeFieldExists: categoryTypeExists,
        migrationNeeded: !categoryTypeExists,
        categoriesCount: categories.length,
        categories: categories,
        message: categoryTypeExists 
          ? 'マイグレーション済み' 
          : 'マイグレーションが必要です'
      })

    } catch (error) {
      return NextResponse.json({
        error: 'Database check failed',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error checking migration status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}