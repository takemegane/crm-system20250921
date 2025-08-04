import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Test Order Creation Start ===')
    
    // テスト用の固定顧客ID（鈴木花子）
    const testCustomerId = 'cmdgtptzz000211e1b5rqkerm' // suzuki@example.com
    
    // カートアイテムを取得
    const cartItems = await prisma.cartItem.findMany({
      where: {
        customerId: testCustomerId
      },
      include: {
        product: true
      }
    })
    
    console.log('Cart items found:', cartItems.length)
    
    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      )
    }
    
    // 商品小計計算
    const subtotalAmount = cartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity)
    }, 0)
    
    console.log('Subtotal amount:', subtotalAmount)
    
    // 商品ごとに送料計算（各商品に送料がかかる）
    let shippingFee = 0
    
    // カートの商品とそのカテゴリを取得
    const productIds = cartItems.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: {
          include: {
            shippingRate: true
          }
        }
      }
    })
    
    console.log('Products with categories:', products.map(p => ({
      id: p.id,
      name: p.name,
      categoryId: p.categoryId,
      categoryName: p.category?.name,
      hasShippingRate: !!p.category?.shippingRate,
      shippingRateActive: p.category?.shippingRate?.isActive,
      shippingFee: p.category?.shippingRate?.shippingFee
    })))
    
    // 商品ごとに送料を計算（各商品の数量分）
    for (const cartItem of cartItems) {
      const product = products.find(p => p.id === cartItem.productId)
      if (!product) continue
      
      console.log(`Processing product: ${product.name} (quantity: ${cartItem.quantity})`)
      
      // 商品ごとに送料を計算（数量分）
      let productShippingFee = 0
      if (product.category?.shippingRate && product.category.shippingRate.isActive) {
        productShippingFee = product.category.shippingRate.shippingFee * cartItem.quantity
        console.log(`Category shipping fee per item: ${product.category.shippingRate.shippingFee}`)
        console.log(`Total for ${cartItem.quantity} items: ${productShippingFee}`)
      } else {
        // デフォルト送料を適用
        productShippingFee = 500 * cartItem.quantity
        console.log(`Default shipping fee per item: 500`)
        console.log(`Total for ${cartItem.quantity} items: ${productShippingFee}`)
      }
      
      shippingFee += productShippingFee
      console.log(`Total shipping fee now: ${shippingFee}`)
    }
    
    // 10,000円以上で送料無料
    if (subtotalAmount >= 10000) {
      console.log('Free shipping applied (>=10000 yen)')
      shippingFee = 0
    }
    
    console.log('Final shipping fee:', shippingFee)
    
    // 合計金額計算
    const totalAmount = subtotalAmount + shippingFee
    
    console.log('Total calculation:', {
      subtotalAmount,
      shippingFee,
      totalAmount
    })
    
    // 実際に注文を作成してみる
    const orderNumber = `TEST-ORDER-${Date.now()}`
    
    console.log('Creating test order...')
    
    const order = await prisma.$transaction(async (tx) => {
      // 注文作成
      const newOrder = await tx.order.create({
        data: {
          customerId: testCustomerId,
          orderNumber,
          subtotalAmount,
          shippingFee,
          totalAmount,
          shippingAddress: 'テスト住所',
          notes: 'テスト注文',
          status: 'PENDING'
        }
      })
      
      console.log('Order created:', newOrder.id)
      
      // 注文アイテム作成
      for (const item of cartItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            subtotal: item.product.price * item.quantity
          }
        })
        console.log('Order item created for product:', item.product.name)
        
        // 在庫更新
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
        console.log('Stock updated for product:', item.product.name)
      }
      
      return newOrder
    })
    
    console.log('Transaction completed successfully')
    
    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      calculation: {
        subtotalAmount,
        shippingFee,
        totalAmount
      }
    })
    
  } catch (error) {
    console.error('Test order error:', error)
    return NextResponse.json(
      { error: 'Test error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}