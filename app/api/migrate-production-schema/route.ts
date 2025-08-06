import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Production schema migration API called')
    
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

    // 認証チェック（OWNER権限のみ）
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'OWNER') {
      console.log('❌ Permission denied - OWNER role required')
      return NextResponse.json({ error: 'OWNER権限が必要です' }, { status: 403 })
    }

    console.log('✅ OWNER permission confirmed')

    const migrationResults = []

    try {
      // 1. courseMapping フィールドが存在するかチェック
      console.log('🔍 Checking if courseMapping field exists...')
      
      let courseMappingExists = false
      try {
        await prisma.$queryRaw`
          SELECT "courseMapping" FROM "Product" LIMIT 1
        `
        courseMappingExists = true
        console.log('✅ courseMapping field already exists')
      } catch (error) {
        console.log('ℹ️ courseMapping field does not exist, will create it')
      }

      if (!courseMappingExists) {
        console.log('➕ Adding courseMapping field to Product table...')
        await prisma.$executeRaw`
          ALTER TABLE "Product" 
          ADD COLUMN "courseMapping" JSON
        `
        console.log('✅ courseMapping field added successfully')
        migrationResults.push('Added courseMapping field to Product table')
      }

      // 2. categoryType フィールドの確認とCOURSE型の追加
      console.log('🔍 Checking categoryType field values...')
      
      const categories = await prisma.category.findMany({
        select: { id: true, name: true, categoryType: true }
      })

      console.log(`📊 Found ${categories.length} categories`)
      
      // COURSE型カテゴリが存在するかチェック
      const hasCourseCategories = categories.some(c => c.categoryType === 'COURSE')
      console.log(`🎓 COURSE type categories exist: ${hasCourseCategories}`)

      // 3. データベースの整合性確認
      console.log('🔍 Verifying database integrity...')
      
      const [productCount, categoryCount, courseCount] = await Promise.all([
        prisma.product.count(),
        prisma.category.count(),
        prisma.course.count()
      ])

      migrationResults.push(`Database counts: ${productCount} products, ${categoryCount} categories, ${courseCount} courses`)

      // 4. サンプルクエリで動作確認
      console.log('🧪 Testing sample queries...')
      
      const sampleProducts = await prisma.product.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          price: true,
          categoryId: true,
          courseMapping: true
        }
      })

      console.log('✅ Sample product query successful')
      migrationResults.push(`Sample query returned ${sampleProducts.length} products`)

      // 5. 基本的なカテゴリが存在することを確認（なければ作成）
      const physicalCategory = await prisma.category.findFirst({
        where: { categoryType: 'PHYSICAL' }
      })

      if (!physicalCategory) {
        console.log('📦 Creating default categories...')
        
        const defaultCategories = [
          {
            name: '書籍・教材',
            description: '参考書、テキスト、学習用教材など',
            categoryType: 'PHYSICAL',
            sortOrder: 1
          },
          {
            name: 'デジタルコンテンツ',
            description: 'オンライン教材、動画講座、PDFファイルなど',
            categoryType: 'DIGITAL',
            sortOrder: 2
          }
        ]

        for (const catData of defaultCategories) {
          const existing = await prisma.category.findFirst({
            where: { name: catData.name }
          })
          
          if (!existing) {
            await prisma.category.create({
              data: { ...catData, isActive: true }
            })
            console.log(`✅ Created category: ${catData.name}`)
            migrationResults.push(`Created category: ${catData.name}`)
          }
        }
      }

      console.log('🎉 Schema migration completed successfully')
      
      return NextResponse.json({
        success: true,
        message: '本番環境のスキーママイグレーションが完了しました',
        migrationResults,
        databaseCounts: {
          products: productCount,
          categories: categoryCount,
          courses: courseCount
        },
        sampleProducts: sampleProducts.map(p => ({
          name: p.name,
          price: p.price,
          hasCourseMapping: !!p.courseMapping
        })),
        timestamp: new Date().toISOString()
      })

    } catch (migrationError) {
      console.error('❌ Migration error:', migrationError)
      return NextResponse.json({
        error: 'Migration failed',
        details: migrationError instanceof Error ? migrationError.message : String(migrationError),
        migrationResults,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error in schema migration:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}