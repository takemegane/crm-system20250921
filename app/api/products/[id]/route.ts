import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, type UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const isCustomer = session?.user?.userType === 'customer'
    
    const product = await prisma.product.findUnique({
      where: { id: params.id }
    })
    
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    
    // 顧客には非公開商品は表示しない
    if (isCustomer && !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // EDIT_PRODUCTS権限チェック
    if (!session || !hasPermission(session.user.role as UserRole, 'EDIT_PRODUCTS')) {
      return NextResponse.json({ error: 'Edit products permission required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { name, description, price, stock, categoryId, imageUrl, sortOrder, isActive, courseMapping } = body
    
    // バリデーション
    if (!name || price === undefined) {
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
    
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock || '0'),
        categoryId: categoryId || null,
        imageUrl,
        sortOrder: parseInt(sortOrder || '0'),
        isActive: isActive !== false,
        courseMapping: courseMapping || null
      }
    })
    
    return NextResponse.json(product)
  } catch (error) {
    console.error('Error updating product:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // DELETE_PRODUCTS権限チェック
    if (!session || !hasPermission(session.user.role as UserRole, 'DELETE_PRODUCTS')) {
      console.log('Delete permission denied:', { 
        hasSession: !!session, 
        role: session?.user?.role,
        hasPermission: session ? hasPermission(session.user.role as UserRole, 'DELETE_PRODUCTS') : false
      })
      return NextResponse.json({ error: 'Delete products permission required' }, { status: 403 })
    }
    
    console.log('Attempting to delete product:', params.id)
    
    await prisma.product.delete({
      where: { id: params.id }
    })
    
    console.log('Product deleted successfully:', params.id)
    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}