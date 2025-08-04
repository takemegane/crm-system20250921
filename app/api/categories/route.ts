import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // 認証チェック（管理者と顧客の両方がアクセス可能）
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // 管理者の場合は権限チェック、顧客の場合は認証済みであればOK
    if (session.user.userType === 'admin' && !hasPermission(session.user.role as UserRole, 'VIEW_PRODUCTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
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
    
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // 商品管理権限のチェック
    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const body = await request.json()
    const { name, description, sortOrder } = body
    
    // バリデーション
    if (!name?.trim()) {
      return NextResponse.json(
        { error: '카테고리名は必須です' },
        { status: 400 }
      )
    }
    
    // 名前の重複チェック
    const existingCategory = await prisma.category.findUnique({
      where: { name: name.trim() }
    })
    
    if (existingCategory) {
      return NextResponse.json(
        { error: 'このカテゴリ名は既に使用されています' },
        { status: 400 }
      )
    }
    
    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: sortOrder || 0,
      },
      include: {
        _count: {
          select: { products: true }
        },
        shippingRate: true
      }
    })
    
    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}