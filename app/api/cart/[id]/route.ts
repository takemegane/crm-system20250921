import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // 顧客のみカート操作可能
    if (!session || session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Customer access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { quantity } = body
    
    // バリデーション
    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Valid quantity is required' },
        { status: 400 }
      )
    }
    
    // カートアイテムの存在確認（自分のアイテムのみ）
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: params.id,
        customerId: session.user.id
      },
      include: {
        product: true
      }
    })
    
    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }
    
    // 商品の有効性確認
    if (!cartItem.product.isActive) {
      return NextResponse.json(
        { error: 'Product is no longer available' },
        { status: 400 }
      )
    }
    
    // 在庫確認
    if (cartItem.product.stock < quantity) {
      return NextResponse.json(
        { error: 'Insufficient stock' },
        { status: 400 }
      )
    }
    
    const updatedItem = await prisma.cartItem.update({
      where: { id: params.id },
      data: { quantity: parseInt(quantity) },
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
    
    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating cart item:', error)
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
    const session = await getServerSession(authOptions)
    
    // 顧客のみカート操作可能
    if (!session || session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Customer access required' }, { status: 403 })
    }
    
    // カートアイテムの存在確認（自分のアイテムのみ）
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: params.id,
        customerId: session.user.id
      }
    })
    
    if (!cartItem) {
      return NextResponse.json({ error: 'Cart item not found' }, { status: 404 })
    }
    
    await prisma.cartItem.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({ message: 'Cart item deleted successfully' })
  } catch (error) {
    console.error('Error deleting cart item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}