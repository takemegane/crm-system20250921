import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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
    const session = await getServerSession(authOptions)
    
    // 顧客のみカート操作可能
    if (!session || session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Customer access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { productId, quantity } = body
    
    // バリデーション
    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Product ID and quantity are required' },
        { status: 400 }
      )
    }
    
    // 商品の存在確認
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })
    
    if (!product || !product.isActive) {
      return NextResponse.json(
        { error: 'Product not found or not available' },
        { status: 404 }
      )
    }
    
    // 在庫確認
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      )
    }
    
    // 既存のカートアイテムをチェック
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        customerId_productId: {
          customerId: session.user.id,
          productId: productId
        }
      }
    })
    
    let cartItem
    
    if (existingItem) {
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
    
    return NextResponse.json(cartItem, { status: 201 })
  } catch (error) {
    console.error('Error adding to cart:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}