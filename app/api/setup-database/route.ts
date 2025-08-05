import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  return await executeSetup()
}

export async function POST(request: NextRequest) {
  return await executeSetup()
}

async function executeSetup() {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL環境変数が設定されていません' },
        { status: 503 }
      )
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { error: 'Prismaクライアントが初期化されていません' },
        { status: 503 }
      )
    }

    console.log('Starting database setup...')
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
    console.log('Prisma client initialized:', !!prisma)

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

      const migrations = []

      // 不足しているカラムを追加するマイグレーション
      console.log('🔧 Checking and adding missing columns...')

      // Tag.description カラム追加
      try {
        await prisma.$executeRaw`ALTER TABLE "Tag" ADD COLUMN description TEXT`
        console.log('✅ Added Tag.description column')
        migrations.push('Tag.description column added')
      } catch (error) {
        console.log('ℹ️ Tag.description column already exists or Tag table does not exist')
      }

      // SystemSettings.backgroundColor カラム追加
      try {
        await prisma.$executeRaw`ALTER TABLE "SystemSettings" ADD COLUMN "backgroundColor" TEXT DEFAULT '#F8FAFC'`
        console.log('✅ Added SystemSettings.backgroundColor column')
        migrations.push('SystemSettings.backgroundColor column added')
      } catch (error) {
        console.log('ℹ️ SystemSettings.backgroundColor column already exists or table does not exist')
      }

      // AuditLog.oldData と newData カラム追加
      try {
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN "oldData" TEXT`
        console.log('✅ Added AuditLog.oldData column')
        migrations.push('AuditLog.oldData column added')
      } catch (error) {
        console.log('ℹ️ AuditLog.oldData column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN "newData" TEXT`
        console.log('✅ Added AuditLog.newData column')
        migrations.push('AuditLog.newData column added')
      } catch (error) {
        console.log('ℹ️ AuditLog.newData column already exists or table does not exist')
      }

      // Product.sortOrder カラム追加
      try {
        await prisma.$executeRaw`ALTER TABLE "Product" ADD COLUMN "sortOrder" INTEGER DEFAULT 0`
        console.log('✅ Added Product.sortOrder column')
        migrations.push('Product.sortOrder column added')
      } catch (error) {
        console.log('ℹ️ Product.sortOrder column already exists or table does not exist')
      }

      // Category.sortOrder カラム追加
      try {
        await prisma.$executeRaw`ALTER TABLE "Category" ADD COLUMN "sortOrder" INTEGER DEFAULT 0`
        console.log('✅ Added Category.sortOrder column')
        migrations.push('Category.sortOrder column added')
      } catch (error) {
        console.log('ℹ️ Category.sortOrder column already exists or table does not exist')
      }

      // SystemSettings の不足フィールド追加
      try {
        await prisma.$executeRaw`ALTER TABLE "SystemSettings" ADD COLUMN "communityLinkText" TEXT`
        console.log('✅ Added SystemSettings.communityLinkText column')
        migrations.push('SystemSettings.communityLinkText column added')
      } catch (error) {
        console.log('ℹ️ SystemSettings.communityLinkText column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "SystemSettings" ADD COLUMN "communityLinkUrl" TEXT`
        console.log('✅ Added SystemSettings.communityLinkUrl column')
        migrations.push('SystemSettings.communityLinkUrl column added')
      } catch (error) {
        console.log('ℹ️ SystemSettings.communityLinkUrl column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "SystemSettings" ADD COLUMN "logoUrl" TEXT`
        console.log('✅ Added SystemSettings.logoUrl column')
        migrations.push('SystemSettings.logoUrl column added')
      } catch (error) {
        console.log('ℹ️ SystemSettings.logoUrl column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "SystemSettings" ADD COLUMN "faviconUrl" TEXT`
        console.log('✅ Added SystemSettings.faviconUrl column')
        migrations.push('SystemSettings.faviconUrl column added')
      } catch (error) {
        console.log('ℹ️ SystemSettings.faviconUrl column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "SystemSettings" ADD COLUMN "description" TEXT`
        console.log('✅ Added SystemSettings.description column')
        migrations.push('SystemSettings.description column added')
      } catch (error) {
        console.log('ℹ️ SystemSettings.description column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "SystemSettings" ADD COLUMN "isActive" BOOLEAN DEFAULT true`
        console.log('✅ Added SystemSettings.isActive column')
        migrations.push('SystemSettings.isActive column added')
      } catch (error) {
        console.log('ℹ️ SystemSettings.isActive column already exists or table does not exist')
      }

      // ShippingRateテーブルの不足カラム追加
      try {
        await prisma.$executeRaw`ALTER TABLE "ShippingRate" ADD COLUMN "shippingFee" DOUBLE PRECISION DEFAULT 0`
        console.log('✅ Added ShippingRate.shippingFee column')
        migrations.push('ShippingRate.shippingFee column added')
      } catch (error) {
        console.log('ℹ️ ShippingRate.shippingFee column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "ShippingRate" ADD COLUMN "freeShippingThreshold" DOUBLE PRECISION`
        console.log('✅ Added ShippingRate.freeShippingThreshold column')
        migrations.push('ShippingRate.freeShippingThreshold column added')
      } catch (error) {
        console.log('ℹ️ ShippingRate.freeShippingThreshold column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "ShippingRate" ADD COLUMN "isActive" BOOLEAN DEFAULT true`
        console.log('✅ Added ShippingRate.isActive column')
        migrations.push('ShippingRate.isActive column added')
      } catch (error) {
        console.log('ℹ️ ShippingRate.isActive column already exists or table does not exist')
      }

      // AuditLogテーブルの不足カラム追加
      try {
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN "ipAddress" TEXT`
        console.log('✅ Added AuditLog.ipAddress column')
        migrations.push('AuditLog.ipAddress column added')
      } catch (error) {
        console.log('ℹ️ AuditLog.ipAddress column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN "userAgent" TEXT`
        console.log('✅ Added AuditLog.userAgent column')
        migrations.push('AuditLog.userAgent column added')
      } catch (error) {
        console.log('ℹ️ AuditLog.userAgent column already exists or table does not exist')
      }

      try {
        await prisma.$executeRaw`ALTER TABLE "AuditLog" ADD COLUMN "userName" TEXT`
        console.log('✅ Added AuditLog.userName column')
        migrations.push('AuditLog.userName column added')
      } catch (error) {
        console.log('ℹ️ AuditLog.userName column already exists or table does not exist')
      }

      console.log('🎉 Database schema migration completed')

      return NextResponse.json(
        { 
          message: 'データベースマイグレーションが完了しました',
          migrations: migrations,
          details: 'スキーマの不整合が修復されました'
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
    const prisma = getPrismaClient()
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}