import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_PRODUCTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const shippingRate = await prisma.shippingRate.findUnique({
      where: { id: params.id },
      include: {
        category: true
      }
    })
    
    if (!shippingRate) {
      return NextResponse.json({ error: 'Shipping rate not found' }, { status: 404 })
    }
    
    return NextResponse.json(shippingRate)
  } catch (error) {
    console.error('Error fetching shipping rate:', error)
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
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const body = await request.json()
    const { categoryId, shippingFee, freeShippingThreshold, isActive } = body
    
    // バリデーション
    if (shippingFee === undefined || shippingFee < 0) {
      return NextResponse.json(
        { error: '送料は0以上の値を設定してください' },
        { status: 400 }
      )
    }

    if (freeShippingThreshold !== null && freeShippingThreshold !== undefined && freeShippingThreshold < 0) {
      return NextResponse.json(
        { error: '送料無料の閾値は0以上の値を設定してください' },
        { status: 400 }
      )
    }
    
    // 存在チェック
    const existingRate = await prisma.shippingRate.findUnique({
      where: { id: params.id }
    })
    
    if (!existingRate) {
      return NextResponse.json({ error: 'Shipping rate not found' }, { status: 404 })
    }
    
    // カテゴリが指定されている場合、カテゴリの存在確認
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      })
      
      if (!category) {
        return NextResponse.json(
          { error: '指定されたカテゴリが見つかりません' },
          { status: 400 }
        )
      }
    }
    
    // カテゴリ別送料の重複チェック（自分以外、デフォルト送料は除外）
    if (categoryId) {
      const duplicateRate = await prisma.shippingRate.findFirst({
        where: {
          categoryId: categoryId,
          id: { not: params.id }
        }
      })
      
      if (duplicateRate) {
        return NextResponse.json(
          { error: 'このカテゴリには既に送料設定が存在します' },
          { status: 400 }
        )
      }
    }
    
    const shippingRate = await prisma.shippingRate.update({
      where: { id: params.id },
      data: {
        categoryId: categoryId || null,
        shippingFee: parseFloat(shippingFee),
        freeShippingThreshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        category: true
      }
    })
    
    return NextResponse.json(shippingRate)
  } catch (error) {
    console.error('Error updating shipping rate:', error)
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
    
    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // 存在チェック
    const shippingRate = await prisma.shippingRate.findUnique({
      where: { id: params.id }
    })
    
    if (!shippingRate) {
      return NextResponse.json({ error: 'Shipping rate not found' }, { status: 404 })
    }
    
    await prisma.shippingRate.delete({
      where: { id: params.id }
    })
    
    return NextResponse.json({ message: 'Shipping rate deleted successfully' })
  } catch (error) {
    console.error('Error deleting shipping rate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}