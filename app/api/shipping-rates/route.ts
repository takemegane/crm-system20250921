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
    console.log('📦 Shipping rate creation API called')
    
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
    console.log('👤 Session user:', session?.user?.email || 'No session', 'role:', session?.user?.role)
    
    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PRODUCTS')) {
      console.log('❌ Permission denied for user:', session?.user?.email, 'role:', session?.user?.role)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    console.log('✅ Permission check passed')
    
    const body = await request.json()
    console.log('📝 Request body received:', JSON.stringify(body, null, 2))
    
    const { categoryId, shippingFee, freeShippingThreshold, isActive } = body
    console.log('🔍 Extracted fields:')
    console.log('  - categoryId:', categoryId)
    console.log('  - shippingFee:', shippingFee, '(type:', typeof shippingFee, ')')
    console.log('  - freeShippingThreshold:', freeShippingThreshold, '(type:', typeof freeShippingThreshold, ')')
    console.log('  - isActive:', isActive)
    
    // バリデーション
    console.log('🔍 Starting validation...')
    if (shippingFee === undefined || shippingFee < 0) {
      console.log('❌ Validation failed: Invalid shipping fee:', shippingFee)
      return NextResponse.json(
        { error: '送料は0以上の値を設定してください' },
        { status: 400 }
      )
    }

    if (freeShippingThreshold !== null && freeShippingThreshold !== undefined && freeShippingThreshold < 0) {
      console.log('❌ Validation failed: Invalid free shipping threshold:', freeShippingThreshold)
      return NextResponse.json(
        { error: '送料無料の閾値は0以上の値を設定してください' },
        { status: 400 }
      )
    }

    console.log('✅ Basic validation passed')

    // カテゴリが指定されている場合、カテゴリの存在確認
    if (categoryId) {
      console.log('🔍 Checking category existence for ID:', categoryId)
      const category = await prisma.category.findUnique({
        where: { id: categoryId }
      })
      
      if (!category) {
        console.log('❌ Category not found:', categoryId)
        return NextResponse.json(
          { error: '指定されたカテゴリが見つかりません' },
          { status: 400 }
        )
      }
      console.log('✅ Category found:', category.name)
    } else {
      console.log('ℹ️ No category specified (default shipping rate)')
    }
    
    // カテゴリ別送料の重複チェック（デフォルト送料は除外）
    if (categoryId) {
      console.log('🔍 Checking for existing shipping rate for category:', categoryId)
      const existingRate = await prisma.shippingRate.findUnique({
        where: { categoryId: categoryId }
      })
      
      if (existingRate) {
        console.log('❌ Existing shipping rate found for category:', categoryId)
        return NextResponse.json(
          { error: 'このカテゴリには既に送料設定が存在します' },
          { status: 400 }
        )
      }
      console.log('✅ No existing shipping rate for this category')
    }
    
    console.log('🔄 Creating shipping rate...')
    const shippingRateData = {
      categoryId: categoryId || null,
      shippingFee: parseFloat(shippingFee),
      freeShippingThreshold: freeShippingThreshold ? parseFloat(freeShippingThreshold) : null,
      isActive: isActive !== undefined ? isActive : true
    }
    console.log('📝 Shipping rate data to create:', JSON.stringify(shippingRateData, null, 2))
    
    const shippingRate = await prisma.shippingRate.create({
      data: shippingRateData,
      include: {
        category: true
      }
    })
    console.log('✅ Shipping rate created successfully with ID:', shippingRate.id)
    
    console.log('🎉 Shipping rate creation completed successfully')
    return NextResponse.json(shippingRate, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating shipping rate:', error)
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}