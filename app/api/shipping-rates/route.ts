import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_PRODUCTS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const shippingRates = await prisma.shippingRate.findMany({
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({ shippingRates })
  } catch (error) {
    console.error('Error fetching shipping rates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    
    // カテゴリ別送料の重複チェック（デフォルト送料は除外）
    if (categoryId) {
      const existingRate = await prisma.shippingRate.findUnique({
        where: { categoryId: categoryId }
      })
      
      if (existingRate) {
        return NextResponse.json(
          { error: 'このカテゴリには既に送料設定が存在します' },
          { status: 400 }
        )
      }
    }
    
    const shippingRate = await prisma.shippingRate.create({
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
    
    return NextResponse.json(shippingRate, { status: 201 })
  } catch (error) {
    console.error('Error creating shipping rate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}