import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { error: 'Prismaクライアントが初期化されていません' },
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Starting simplified complete database setup...')

    // データベース接続テスト
    await prisma.$connect()
    console.log('Database connection successful')

    // 重要なテーブルのみ作成
    await createEssentialTables(prisma)
    await createSampleData(prisma)

    return NextResponse.json({
      message: 'データベースの完全セットアップが完了しました',
      details: '重要なテーブルとサンプルデータが作成されました'
    }, {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: `セットアップエラー: ${error instanceof Error ? error.message : 'Unknown error'}` },
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

async function createEssentialTables(prisma: any) {
  const tables = [
    {
      name: 'Category',
      sql: `CREATE TABLE IF NOT EXISTS "Category" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        description TEXT,
        "isActive" BOOLEAN DEFAULT TRUE,
        "displayOrder" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'Product',
      sql: `CREATE TABLE IF NOT EXISTS "Product" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        "categoryId" TEXT,
        "imageUrl" TEXT,
        "isActive" BOOLEAN DEFAULT TRUE,
        "displayOrder" INTEGER DEFAULT 0,
        stock INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'ShippingRate',
      sql: `CREATE TABLE IF NOT EXISTS "ShippingRate" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "categoryId" TEXT,
        name TEXT NOT NULL,
        rate DECIMAL(10,2) NOT NULL,
        "freeThreshold" DECIMAL(10,2),
        "isDefault" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'SystemSettings',
      sql: `CREATE TABLE IF NOT EXISTS "SystemSettings" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "systemName" TEXT DEFAULT 'CRM管理システム',
        "logoUrl" TEXT,
        "faviconUrl" TEXT,
        "primaryColor" TEXT DEFAULT '#3B82F6',
        "secondaryColor" TEXT DEFAULT '#EF4444',
        description TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    },
    {
      name: 'EmailSettings',
      sql: `CREATE TABLE IF NOT EXISTS "EmailSettings" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        "smtpHost" TEXT,
        "smtpPort" INTEGER DEFAULT 587,
        "smtpUser" TEXT,
        "smtpPass" TEXT,
        "fromName" TEXT DEFAULT 'CRM管理システム',
        "fromAddress" TEXT,
        signature TEXT,
        "isActive" BOOLEAN DEFAULT FALSE,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    }
  ]

  for (const table of tables) {
    try {
      console.log(`Creating ${table.name} table...`)
      await prisma.$executeRawUnsafe(table.sql)
      console.log(`${table.name} table OK`)
    } catch (error) {
      console.log(`${table.name} table already exists or error:`, error)
    }
  }
}

async function createSampleData(prisma: any) {
  try {
    // サンプルカテゴリ
    const categoryCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Category"` as any[]
    if (parseInt(categoryCount[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "Category" (id, name, description, "displayOrder")
        VALUES 
        ('category-1', '書籍', '各種書籍・教材', 1),
        ('category-2', 'グッズ', 'オリジナルグッズ', 2)
      `
      console.log('Sample categories created')
    }

    // サンプル商品
    const productCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Product"` as any[]
    if (parseInt(productCount[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "Product" (id, name, description, price, "categoryId", stock, "displayOrder")
        VALUES 
        ('product-1', 'テキストブック', '基本テキスト', 2000, 'category-1', 100, 1),
        ('product-2', 'オリジナルTシャツ', 'ロゴ入りTシャツ', 3500, 'category-2', 50, 2)
      `
      console.log('Sample products created')
    }

    // デフォルト送料
    const shippingCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "ShippingRate"` as any[]
    if (parseInt(shippingCount[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "ShippingRate" (id, name, rate, "freeThreshold", "isDefault")
        VALUES 
        ('shipping-1', 'デフォルト送料', 500, 10000, true)
      `
      console.log('Default shipping rate created')
    }

    // システム設定
    const settingsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "SystemSettings"` as any[]
    if (parseInt(settingsCount[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "SystemSettings" (id, "systemName", "primaryColor", "secondaryColor", description)
        VALUES 
        ('settings-1', 'CRM管理システム', '#3B82F6', '#EF4444', '顧客関係管理システム')
      `
      console.log('System settings created')
    }

    // メール設定
    const emailSettingsCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "EmailSettings"` as any[]
    if (parseInt(emailSettingsCount[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "EmailSettings" (id, "fromName", "isActive")
        VALUES 
        ('email-settings-1', 'CRM管理システム', false)
      `
      console.log('Email settings created')
    }

  } catch (error) {
    console.error('Sample data creation error:', error)
  }
}