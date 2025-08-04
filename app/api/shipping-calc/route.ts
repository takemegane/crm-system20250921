import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateShipping } from '@/lib/shipping-calculator'

export async function POST(req: NextRequest) {
  try {
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
    
    // 統一送料計算関数を使用
    const shippingCalculation = await calculateShipping(convertedCartItems)
    
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