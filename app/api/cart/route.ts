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
    
    // 顧客のみカート操作可能
    if (!session || session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Customer access required' }, { status: 403 })
    }
    
    const cartItems = await prisma.cartItem.findMany({
      where: {
        customerId: session.user.id
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            stock: true,
            imageUrl: true,
            isActive: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // 有効な商品のみ返す
    const validCartItems = cartItems.filter(item => item.product.isActive)
    
    // 総額計算
    const total = validCartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity)
    }, 0)
    
    const cartData = {
      items: validCartItems,
      total,
      itemCount: validCartItems.reduce((sum, item) => sum + item.quantity, 0)
    }
    
    
    return NextResponse.json(cartData)
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 Cart POST API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }
    console.log('✅ DATABASE_URL available')

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }
    console.log('✅ Prisma client ready')

    const session = await getServerSession(authOptions)
    console.log('👤 Session user:', session?.user?.email || 'No session', 'userType:', session?.user?.userType)
    
    // 顧客のみカート操作可能
    if (!session || session.user.userType !== 'customer') {
      console.log('❌ Permission denied - not a customer')
      return NextResponse.json({ error: 'Customer access required' }, { status: 403 })
    }
    console.log('✅ Permission check passed')
    
    const body = await request.json()
    const { productId, quantity } = body
    console.log('📝 Request body:', { productId, quantity })
    
    // バリデーション
    if (!productId || !quantity || quantity < 1) {
      console.log('❌ Validation failed:', { productId, quantity })
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      )
    }
    console.log('✅ Validation passed')
    
    // 商品の存在確認
    console.log('🔍 Finding product:', productId)
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })
    console.log('📦 Product found:', product ? { id: product.id, name: product.name, stock: product.stock, isActive: product.isActive } : 'null')
    
    if (!product || !product.isActive) {
      console.log('❌ Product not found or inactive')
      return NextResponse.json(
        { error: 'Product not found or not available' },
        { status: 404 }
      )
    }
    console.log('✅ Product validation passed')
    
    // 在庫確認
    if (product.stock < quantity) {
      console.log('❌ Insufficient stock:', { available: product.stock, requested: quantity })
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      )
    }
    console.log('✅ Stock check passed')
    
    // 既存のカートアイテムをチェック
    console.log('🔍 Checking existing cart item')
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        customerId: session.user.id,
        productId: productId
      }
    })
    console.log('🔍 Existing item found:', existingItem ? { id: existingItem.id, quantity: existingItem.quantity } : 'null')
    
    let cartItem
    
    if (existingItem) {
      console.log('🔄 Updating existing cart item')
      // 既存アイテムの数量を更新
      const newQuantity = existingItem.quantity + quantity
      
      // 在庫再確認
      if (product.stock < newQuantity) {
        return NextResponse.json(
          { error: 'Insufficient stock for total quantity' },
          { status: 400 }
        )
      }
      
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              imageUrl: true,
              isActive: true
            }
          }
        }
      })
    } else {
      // 新しいカートアイテムを作成
      console.log('➕ Creating new cart item')
      cartItem = await prisma.cartItem.create({
        data: {
          customerId: session.user.id,
          productId,
          quantity: parseInt(quantity)
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              imageUrl: true,
              isActive: true
            }
          }
        }
      })
    }
    
    console.log('✅ Cart item operation completed successfully')
    console.log('🎯 Final cart item:', cartItem ? { id: cartItem.id, quantity: cartItem.quantity, productName: cartItem.product.name } : 'null')
    
    return NextResponse.json(cartItem, { status: 201 })
  } catch (error) {
    console.error('❌ Error adding to cart:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error))
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      errorType: error?.constructor?.name || 'Unknown'
    })
    
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