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
      await createAllTables(prisma)

      // サンプルデータの作成
      await createSampleData(prisma)

      return NextResponse.json({
        message: 'データベースの完全セットアップが完了しました',
        details: 'すべてのテーブルとサンプルデータが作成されました'
      })

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
  }
}

async function createAllTables(prisma: any) {
  // Customer テーブル
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

  } catch (error) {
    console.error('Sample data creation error:', error)
    // エラーでも継続（データが既に存在する可能性）
  }
}