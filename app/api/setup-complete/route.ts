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
        { status: 503 }
      )
    }

    console.log('Starting complete database setup...')

    // Prismaスキーマプッシュを実行
    try {
      // データベース接続テスト
      await prisma.$connect()
      console.log('Database connection successful')

      // 基本的なテーブル存在確認
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      ` as any[]

      console.log('Existing tables:', tables.map(t => t.table_name))

      // 必要なテーブルを個別に作成
      console.log('Creating tables...')
      await createAllTables(prisma)
      console.log('Tables created successfully')

      // サンプルデータの作成
      console.log('Creating sample data...')
      await createSampleData(prisma)
      console.log('Sample data created successfully')

      return NextResponse.json({
        message: 'データベースの完全セットアップが完了しました',
        details: 'すべてのテーブルとサンプルデータが作成されました'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

    } catch (error) {
      console.error('Database setup error:', error)
      return NextResponse.json(
        { error: `データベースセットアップエラー: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
    }
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: `セットアップエラー: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  } finally {
    const prisma = getPrismaClient()
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}

async function createAllTables(prisma: any) {
  try {
    // Customer テーブル（既存の場合はスキップ）
    console.log('Creating Customer table...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Customer" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
    console.log('Customer table OK')
  } catch (error) {
    console.log('Customer table already exists or error:', error)
  }

  // Course テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Course" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      description TEXT,
      price DECIMAL(10,2),
      duration INTEGER,
      "isActive" BOOLEAN DEFAULT TRUE,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Tag テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Tag" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // CustomerTag 中間テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "CustomerTag" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "customerId" TEXT NOT NULL,
      "tagId" TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE CASCADE,
      FOREIGN KEY ("tagId") REFERENCES "Tag"(id) ON DELETE CASCADE,
      UNIQUE("customerId", "tagId")
    )
  `

  // Enrollment テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Enrollment" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "customerId" TEXT NOT NULL,
      "courseId" TEXT NOT NULL,
      "enrolledAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE CASCADE,
      FOREIGN KEY ("courseId") REFERENCES "Course"(id) ON DELETE CASCADE
    )
  `

  // EmailTemplate テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "EmailTemplate" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      "isActive" BOOLEAN DEFAULT TRUE,
      "isDefault" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // EmailLog テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "EmailLog" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "templateId" TEXT,
      "customerId" TEXT,
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      "recipientEmail" TEXT NOT NULL,
      "recipientName" TEXT,
      status TEXT DEFAULT 'SENT',
      "sentAt" TIMESTAMP,
      "errorMessage" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"(id) ON DELETE SET NULL,
      FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE SET NULL
    )
  `

  // Category テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Category" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      description TEXT,
      "isActive" BOOLEAN DEFAULT TRUE,
      "displayOrder" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Product テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Product" (
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
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE SET NULL
    )
  `

  // ShippingRate テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "ShippingRate" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "categoryId" TEXT,
      name TEXT NOT NULL,
      rate DECIMAL(10,2) NOT NULL,
      "freeThreshold" DECIMAL(10,2),
      "isDefault" BOOLEAN DEFAULT FALSE,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON DELETE CASCADE
    )
  `

  // SystemSettings テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "SystemSettings" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "systemName" TEXT DEFAULT 'CRM管理システム',
      "logoUrl" TEXT,
      "faviconUrl" TEXT,
      "primaryColor" TEXT DEFAULT '#3B82F6',
      "secondaryColor" TEXT DEFAULT '#EF4444',
      description TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  // Order テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Order" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "customerId" TEXT NOT NULL,
      "orderNumber" TEXT UNIQUE NOT NULL,
      "totalAmount" DECIMAL(10,2) NOT NULL,
      "shippingAmount" DECIMAL(10,2) DEFAULT 0,
      status TEXT DEFAULT 'PENDING',
      "recipientName" TEXT NOT NULL,
      "recipientPhone" TEXT NOT NULL,
      "recipientAddress" TEXT NOT NULL,
      "contactPhone" TEXT,
      "orderedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "shippedAt" TIMESTAMP,
      "deliveredAt" TIMESTAMP,
      "cancelledAt" TIMESTAMP,
      "cancelledBy" TEXT,
      "cancelReason" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("customerId") REFERENCES "Customer"(id) ON DELETE CASCADE
    )
  `

  // OrderItem テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "OrderItem" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE CASCADE,
      FOREIGN KEY ("productId") REFERENCES "Product"(id) ON DELETE CASCADE
    )
  `

  // EmailSettings テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "EmailSettings" (
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
    )
  `

  // AuditLog テーブル
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL,
      "userName" TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      "entityId" TEXT,
      details TEXT,
      "oldValues" TEXT,
      "newValues" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
    )
  `

  console.log('All tables created successfully')
}

async function createSampleData(prisma: any) {
  try {
    // サンプルコースの作成
    const courseExists = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Course"` as any[]
    if (parseInt(courseExists[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "Course" (id, name, description, price, duration, "isActive")
        VALUES 
        ('course-1', 'ベーシックコース', '基本的なコース内容です', 10000, 30, true),
        ('course-2', 'アドバンスコース', '上級者向けのコース内容です', 20000, 60, true)
      `
      console.log('Sample courses created')
    }

    // サンプルタグの作成
    const tagExists = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Tag"` as any[]
    if (parseInt(tagExists[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "Tag" (id, name, color)
        VALUES 
        ('tag-1', 'VIP顧客', '#ff6b6b'),
        ('tag-2', '新規顧客', '#4ecdc4'),
        ('tag-3', '継続顧客', '#45b7d1')
      `
      console.log('Sample tags created')
    }

    // サンプル顧客の作成
    const customerExists = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Customer"` as any[]
    if (parseInt(customerExists[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "Customer" (id, name, "nameKana", email, phone, address)
        VALUES 
        ('customer-1', '田中太郎', 'タナカタロウ', 'tanaka@example.com', '090-1234-5678', '東京都渋谷区1-1-1'),
        ('customer-2', '鈴木花子', 'スズキハナコ', 'suzuki@example.com', '090-8765-4321', '大阪府大阪市中央区2-2-2')
      `
      console.log('Sample customers created')
    }

    // サンプルメールテンプレートの作成
    const templateExists = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "EmailTemplate"` as any[]
    if (parseInt(templateExists[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "EmailTemplate" (id, name, subject, content, "isDefault")
        VALUES 
        ('template-1', 'デフォルトテンプレート', 'お知らせ', 'こんにちは、{{customer_name}}様。\n\nお世話になっております。', true)
      `
      console.log('Sample email template created')
    }

    // サンプルカテゴリの作成
    const categoryExists = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Category"` as any[]
    if (parseInt(categoryExists[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "Category" (id, name, description, "displayOrder")
        VALUES 
        ('category-1', '書籍', '各種書籍・教材', 1),
        ('category-2', 'グッズ', 'オリジナルグッズ', 2)
      `
      console.log('Sample categories created')
    }

    // サンプル商品の作成
    const productExists = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Product"` as any[]
    if (parseInt(productExists[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "Product" (id, name, description, price, "categoryId", stock, "displayOrder")
        VALUES 
        ('product-1', 'テキストブック', '基本テキスト', 2000, 'category-1', 100, 1),
        ('product-2', 'オリジナルTシャツ', 'ロゴ入りTシャツ', 3500, 'category-2', 50, 2)
      `
      console.log('Sample products created')
    }

    // デフォルト送料設定の作成
    const shippingExists = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "ShippingRate"` as any[]
    if (parseInt(shippingExists[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "ShippingRate" (id, name, rate, "freeThreshold", "isDefault")
        VALUES 
        ('shipping-1', 'デフォルト送料', 500, 10000, true)
      `
      console.log('Default shipping rate created')
    }

    // システム設定の作成
    const systemSettingsExists = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "SystemSettings"` as any[]
    if (parseInt(systemSettingsExists[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "SystemSettings" (id, "systemName", "primaryColor", "secondaryColor", description)
        VALUES 
        ('settings-1', 'CRM管理システム', '#3B82F6', '#EF4444', '顧客関係管理システム')
      `
      console.log('System settings created')
    }

    // メール設定の作成
    const emailSettingsExists = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "EmailSettings"` as any[]
    if (parseInt(emailSettingsExists[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO "EmailSettings" (id, "fromName", "isActive")
        VALUES 
        ('email-settings-1', 'CRM管理システム', false)
      `
      console.log('Email settings created')
    }

  } catch (error) {
    console.error('Sample data creation error:', error)
    // エラーでも継続（データが既に存在する可能性）
  }
}