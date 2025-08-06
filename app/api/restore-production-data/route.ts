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
    console.log('🔄 Production data restoration API called')
    
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

    const results = {
      categories: [] as any[],
      products: [] as any[],
      errors: [] as string[]
    }

    try {
      // 1. 既存のコースを確認
      const courses = await prisma.course.findMany({
        where: { isActive: true }
      })
      
      if (courses.length === 0) {
        console.log('📚 Creating default courses...')
        const course1 = await prisma.course.create({
          data: {
            id: 'course1',
            name: 'ベーシックコース',
            description: '初心者向けの基本コース',
            price: 10000,
            duration: 90,
            isActive: true
          }
        })

        const course2 = await prisma.course.create({
          data: {
            id: 'course2',
            name: 'アドバンスコース',
            description: '上級者向けの応用コース',
            price: 20000,
            duration: 180,
            isActive: true
          }
        })
        console.log('✅ Default courses created')
      }

      // 2. コース専用カテゴリ作成
      const courseCategories = [
        {
          name: 'ベーシックコース商品',
          description: 'ベーシックコースに関連する商品カテゴリ（コース自動付与）',
          categoryType: 'COURSE',
          sortOrder: 101,
          courseId: 'course1',
          courseName: 'ベーシックコース'
        },
        {
          name: 'アドバンスコース商品',
          description: 'アドバンスコースに関連する商品カテゴリ（コース自動付与）',
          categoryType: 'COURSE',
          sortOrder: 102,
          courseId: 'course2',
          courseName: 'アドバンスコース'
        }
      ]

      for (const categoryData of courseCategories) {
        const existingCategory = await prisma.category.findFirst({
          where: { name: categoryData.name }
        })

        if (!existingCategory) {
          const category = await prisma.category.create({
            data: {
              name: categoryData.name,
              description: categoryData.description,
              categoryType: categoryData.categoryType,
              sortOrder: categoryData.sortOrder,
              isActive: true
            }
          })
          results.categories.push({ ...category, originalCourseId: categoryData.courseId })
          console.log('✅ Created category:', category.name)
        } else {
          results.categories.push({ ...existingCategory, originalCourseId: categoryData.courseId })
          console.log('ℹ️ Category already exists:', existingCategory.name)
        }
      }

      // 3. コース商品作成
      for (const categoryResult of results.categories) {
        const courseInfo = courseCategories.find(c => c.courseId === categoryResult.originalCourseId)
        if (!courseInfo) continue

        const productName = `${courseInfo.courseName}受講権`
        
        const existingProduct = await prisma.product.findFirst({
          where: { 
            name: productName,
            categoryId: categoryResult.id
          }
        })

        if (!existingProduct) {
          const courseData = await prisma.course.findUnique({
            where: { id: courseInfo.courseId }
          })

          if (courseData) {
            const product = await prisma.product.create({
              data: {
                name: productName,
                description: `${courseData.description}\n\n※この商品を購入すると自動的に${courseInfo.courseName}に登録されます。`,
                price: courseData.price,
                stock: 999,
                categoryId: categoryResult.id,
                sortOrder: 1,
                isActive: true,
                courseMapping: {
                  courseId: courseInfo.courseId,
                  courseName: courseInfo.courseName,
                  autoEnroll: true,
                  description: `購入時に${courseInfo.courseName}へ自動登録`
                }
              }
            })
            results.products.push(product)
            console.log('✅ Created product:', product.name)
          }
        } else {
          results.products.push(existingProduct)
          console.log('ℹ️ Product already exists:', existingProduct.name)
        }
      }

      // 4. デフォルト送料設定確認
      const defaultShippingRate = await prisma.shippingRate.findFirst({
        where: { categoryId: null }
      })

      if (!defaultShippingRate) {
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

    } catch (error) {
      console.error('❌ Error during restoration:', error)
      results.errors.push(String(error))
    }

    console.log('🎉 Production data restoration completed')
    return NextResponse.json({
      message: '本番環境データが正常に復旧されました',
      restored: true,
      summary: {
        categories: results.categories.length,
        products: results.products.length,
        errors: results.errors.length
      },
      details: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in restore production data:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}