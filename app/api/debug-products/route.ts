import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug products API called')
    
    const session = await getServerSession(authOptions)
    console.log('🔍 Session:', {
      hasSession: !!session,
      userId: session?.user?.id,
      role: session?.user?.role,
      userType: session?.user?.userType
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated', debug: true }, { status: 401 })
    }
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma not initialized', debug: true }, { status: 503 })
    }
    
    // 商品数をカウント
    const productCount = await prisma.product.count()
    console.log('🔍 Product count:', productCount)
    
    // 最初の商品を取得
    const firstProduct = await prisma.product.findFirst({
      select: {
        id: true,
        name: true,
        price: true,
        enablePayment: true,
        stripeProductId: true,
        stripePriceId: true,
        isActive: true
      }
    })
    console.log('🔍 First product:', firstProduct)
    
    // 商品一覧を取得（同じクエリ）
    const products = await prisma.product.findMany({
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
      take: 5
    })
    
    return NextResponse.json({
      debug: true,
      session: {
        authenticated: true,
        role: session.user.role,
        userType: session.user.userType
      },
      database: {
        productCount,
        firstProduct,
        products: products.slice(0, 2) // 最初の2つだけ
      },
      message: 'Debug successful'
    })
    
  } catch (error) {
    console.error('🔍 Debug products error:', error)
    return NextResponse.json({
      debug: true,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}