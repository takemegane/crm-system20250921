import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }


    const session = await getServerSession(authOptions)
    
    // 顧客は有効な商品のみ表示、管理者は全商品表示
    const isCustomer = session?.user?.userType === 'customer'
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    
    const skip = (page - 1) * limit
    
    // フィルター条件を構築
    const where: any = {}
    
    if (isCustomer) {
      where.isActive = true // 顧客には有効な商品のみ
    }
    
    if (category) {
      where.categoryId = category
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ]
    }
    
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          imageUrl: true,
          categoryId: true,
          sortOrder: true,
          isActive: true,
          enablePayment: true,
          stripeProductId: true,
          stripePriceId: true,
          courseMapping: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              categoryType: true
            }
          }
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.product.count({ where })
    ])
    
    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }


    const session = await getServerSession(authOptions)
    
    // 管理者のみ商品作成可能
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { 
      name, 
      description, 
      price, 
      stock, 
      categoryId, 
      imageUrl, 
      sortOrder, 
      isActive, 
      courseMapping, 
      enablePayment, 
      stripeProductId, 
      stripePriceId 
    } = body
    
    // バリデーション
    if (!name || !price) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      )
    }
    
    if (price < 0 || stock < 0) {
      return NextResponse.json(
        { error: 'Price and stock must be non-negative' },
        { status: 400 }
      )
    }
    
    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock || '0'),
        categoryId: categoryId || null,
        imageUrl,
        sortOrder: parseInt(sortOrder || '0'),
        isActive: isActive !== false,
        courseMapping: courseMapping || null,
        enablePayment: enablePayment || false,
        stripeProductId: stripeProductId || null,
        stripePriceId: stripePriceId || null
      }
    })
    
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}