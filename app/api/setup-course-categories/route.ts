import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🎓 Creating course-specific categories...')
    
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

    // 認証チェック
    const session = await getServerSession(authOptions)
    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')) {
      console.log('❌ Permission denied for user:', session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 既存のコースを取得
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true
      }
    })

    console.log(`📚 Found ${courses.length} active courses`)

    // 既存のCOURSEカテゴリを確認
    const existingCourseCategories = await prisma.category.findMany({
      where: { categoryType: 'COURSE' }
    })

    console.log(`📂 Found ${existingCourseCategories.length} existing course categories`)

    const results = {
      categories: [] as any[],
      existingCategories: existingCourseCategories.length,
      courses: courses.length,
      skipped: [] as string[]
    }

    // 各コースに対してカテゴリを作成
    for (const course of courses) {
      const categoryName = `${course.name}商品`
      
      // 既存チェック
      const existingCategory = await prisma.category.findFirst({
        where: { name: categoryName }
      })

      if (existingCategory) {
        console.log(`ℹ️ Category already exists: ${categoryName}`)
        results.skipped.push(categoryName)
        results.categories.push(existingCategory)
        continue
      }

      // コース専用カテゴリ作成
      const newCategory = await prisma.category.create({
        data: {
          name: categoryName,
          description: `${course.name}に関連する商品カテゴリ（コース自動付与）`,
          categoryType: 'COURSE',
          sortOrder: 100 + results.categories.length, // 他のカテゴリより後に表示
          isActive: true
        }
      })

      console.log(`✅ Created course category: ${newCategory.name}`)
      results.categories.push(newCategory)
    }

    // デフォルト送料設定があることを確認
    const defaultShippingRate = await prisma.shippingRate.findFirst({
      where: { categoryId: null }
    })

    if (!defaultShippingRate) {
      console.log('📦 Creating default shipping rate...')
      await prisma.shippingRate.create({
        data: {
          categoryId: null,
          shippingFee: 500,
          freeShippingThreshold: 10000,
          isActive: true
        }
      })
      console.log('✅ Default shipping rate created')
    }

    console.log('🎉 Course category setup completed')
    
    return NextResponse.json({
      message: 'コース専用カテゴリが正常に作成されました',
      created: results.categories.filter(c => !results.skipped.includes(c.name)).length,
      skipped: results.skipped.length,
      total: results.categories.length,
      categories: results.categories.map(c => ({
        id: c.id,
        name: c.name,
        type: c.categoryType,
        description: c.description
      })),
      courses: courses.map(c => ({
        id: c.id,
        name: c.name,
        price: c.price
      })),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error creating course categories:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// 現在の状況確認用GET
export async function GET() {
  try {
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const [courses, courseCategories, allCategories] = await Promise.all([
      prisma.course.findMany({
        where: { isActive: true },
        select: { id: true, name: true, price: true }
      }),
      prisma.category.findMany({
        where: { categoryType: 'COURSE' }
      }),
      prisma.category.count()
    ])

    return NextResponse.json({
      courses: courses.length,
      courseCategories: courseCategories.length,
      totalCategories: allCategories,
      courseCategoriesList: courseCategories.map(c => ({
        name: c.name,
        description: c.description,
        isActive: c.isActive
      })),
      coursesList: courses.map(c => ({
        name: c.name,
        price: c.price
      })),
      needsSetup: courses.length > courseCategories.length
    })

  } catch (error) {
    console.error('Error checking course categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}