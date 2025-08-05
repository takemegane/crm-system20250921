import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'
import { calculateShipping } from '@/lib/shipping-calculator'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
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


    const body = await req.json()
    const { cartItems } = body
    
    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          shippingFee: 0,
          totalAmount: 0,
          isShippingFree: true,
          freeShippingThreshold: 10000
        }
      })
    }
    
    // カートアイテムを統一送料計算関数用の形式に変換
    const convertedCartItems = await Promise.all(
      cartItems.map(async (item: any) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            price: true,
            categoryId: true
          }
        })
        
        if (!product) {
          throw new Error(`商品が見つかりません: ${item.productId}`)
        }
        
        return {
          productId: item.productId,
          quantity: item.quantity,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            categoryId: product.categoryId
          }
        }
      })
    )
    
    // 統一送料計算関数を使用（Prismaクライアントを渡す）
    const shippingCalculation = await calculateShipping(convertedCartItems, prisma)
    
    return NextResponse.json({
      success: true,
      data: {
        shippingFee: shippingCalculation.shippingFee,
        totalAmount: shippingCalculation.totalAmount,
        isShippingFree: shippingCalculation.calculation.freeShippingApplied,
        freeShippingThreshold: shippingCalculation.calculation.freeShippingThreshold,
        originalShippingFee: shippingCalculation.shippingFee,
        subtotalAmount: shippingCalculation.subtotalAmount
      }
    })
  } catch (error) {
    console.error('Error calculating shipping:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Shipping calculation failed' 
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'Shipping calculation API is working', 
    timestamp: new Date().toISOString() 
  })
}