import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('📋 Category GET API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    const session = await getServerSession(authOptions)
    console.log('👤 Session user:', session?.user?.email || 'No session')
    console.log('👤 User type:', session?.user?.userType || 'No userType')
    console.log('👤 User role:', session?.user?.role || 'No role')
    
    // 認証チェック（管理者と顧客の両方がアクセス可能）
    if (!session) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // 管理者の場合は権限チェック、顧客の場合は認証済みであればOK
    if (session.user.userType === 'admin' && !hasPermission(session.user.role as UserRole, 'VIEW_PRODUCTS')) {
      console.log('❌ Permission denied for admin user:', session.user.email, 'role:', session.user.role)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    console.log('✅ Permission check passed')
    console.log('🔍 Fetching categories...')
    
    const categories = await prisma.category.findMany({
      where: {
        isActive: true
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ],
      include: {
        _count: {
          select: { products: true }
        },
        shippingRate: true
      }
    })
    
    console.log('✅ Categories fetched successfully, count:', categories.length)
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('❌ Error fetching categories:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📦 Category creation API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    const session = await getServerSession(authOptions)
    console.log('👤 Session user:', session?.user?.email || 'No session')
    
    // 商品管理権限のチェック
    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')) {
      console.log('❌ Permission denied for user:', session?.user?.email, 'role:', session?.user?.role)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const body = await request.json()
    console.log('📝 Request body:', body)
    const { name, description, sortOrder } = body
    
    // バリデーション
    if (!name?.trim()) {
      console.log('❌ Category name is missing')
      return NextResponse.json(
        { error: 'カテゴリ名は必須です' },
        { status: 400 }
      )
    }
    
    console.log('🔍 Checking for existing category with name:', name.trim())
    // 名前の重複チェック
    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() }
    })
    
    if (existingCategory) {
      console.log('❌ Category already exists:', existingCategory.id)
      return NextResponse.json(
        { error: 'このカテゴリ名は既に使用されています' },
        { status: 400 }
      )
    }
    
    console.log('✅ Creating new category...')
    const categoryData = {
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: sortOrder || 0,
    }
    console.log('📦 Category data:', categoryData)
    
    const category = await prisma.category.create({
      data: categoryData,
      include: {
        _count: {
          select: { products: true }
        },
        shippingRate: true
      }
    })
    
    console.log('✅ Category created successfully:', category.id)
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating category:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}