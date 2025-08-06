import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Production debug API called')
    
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
    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')) {
      console.log('❌ Permission denied for user:', session?.user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    console.log('✅ Permission check passed')

    // データベース状況確認
    const [products, categories, users, courses] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true,
          categoryId: true,
          courseMapping: true,
          category: {
            select: {
              id: true,
              name: true,
              categoryType: true
            }
          }
        }
      }),
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          categoryType: true,
          isActive: true,
          sortOrder: true
        }
      }),
      prisma.user.count(),
      prisma.course.findMany({
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true
        }
      })
    ])

    const debugInfo = {
      timestamp: new Date().toISOString(),
      database: {
        url: process.env.DATABASE_URL ? 'Set' : 'Not set',
        products: products.length,
        categories: categories.length,
        users: users,
        courses: courses.length
      },
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        isActive: p.isActive,
        categoryName: p.category?.name,
        categoryType: p.category?.categoryType,
        hasCourseMapping: !!p.courseMapping
      })),
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        type: c.categoryType,
        isActive: c.isActive,
        sortOrder: c.sortOrder
      })),
      courses: courses.map(c => ({
        id: c.id,
        name: c.name,
        price: c.price,
        isActive: c.isActive
      }))
    }

    console.log('📊 Debug info collected:', debugInfo)
    return NextResponse.json(debugInfo)

  } catch (error) {
    console.error('❌ Error in debug API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}