import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🐛 Debug Order API called')
    
    // Step 1: データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ Step 1 Failed: DATABASE_URL not available')
      return NextResponse.json({ 
        error: 'Step 1 Failed', 
        details: 'DATABASE_URL not available',
        step: 1
      }, { status: 503 })
    }
    console.log('✅ Step 1 Passed: DATABASE_URL available')

    // Step 2: Prismaクライアント初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Step 2 Failed: Prisma client not initialized')
      return NextResponse.json({ 
        error: 'Step 2 Failed', 
        details: 'Prisma client not initialized',
        step: 2
      }, { status: 503 })
    }
    console.log('✅ Step 2 Passed: Prisma client ready')

    // Step 3: セッション確認
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('❌ Step 3 Failed: No session')
      return NextResponse.json({ 
        error: 'Step 3 Failed', 
        details: 'No session',
        step: 3
      }, { status: 401 })
    }
    console.log('✅ Step 3 Passed: Session found', {
      email: session.user?.email,
      userType: session.user?.userType,
      id: session.user?.id
    })

    // Step 4: ユーザー権限確認（顧客または管理者）
    const isCustomer = session.user.userType === 'customer'
    const isAdmin = session.user.userType === 'admin'
    
    if (!isCustomer && !isAdmin) {
      console.log('❌ Step 4 Failed: Not a customer or admin')
      return NextResponse.json({ 
        error: 'Step 4 Failed', 
        details: 'Not a customer or admin',
        step: 4,
        userType: session.user.userType
      }, { status: 403 })
    }
    console.log('✅ Step 4 Passed: User access confirmed', {
      userType: session.user.userType,
      isCustomer,
      isAdmin
    })

    // Step 5: リクエストボディ解析
    let body
    try {
      body = await request.json()
      console.log('✅ Step 5 Passed: Request body parsed', body)
    } catch (error) {
      console.log('❌ Step 5 Failed: Invalid JSON')
      return NextResponse.json({ 
        error: 'Step 5 Failed', 
        details: 'Invalid JSON in request body',
        step: 5
      }, { status: 400 })
    }

    // Step 6: カートアイテム取得テスト
    try {
      const cartItems = await prisma.cartItem.findMany({
        where: {
          customerId: session.user.id
        },
        include: {
          product: true
        }
      })
      console.log('✅ Step 6 Passed: Cart items retrieved', {
        count: cartItems.length,
        items: cartItems.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.price
        }))
      })

      if (cartItems.length === 0) {
        return NextResponse.json({ 
          error: 'Step 6 Warning', 
          details: 'Cart is empty',
          step: 6,
          cartCount: 0
        }, { status: 400 })
      }

    } catch (error) {
      console.log('❌ Step 6 Failed: Cart query error', error)
      return NextResponse.json({ 
        error: 'Step 6 Failed', 
        details: error instanceof Error ? error.message : String(error),
        step: 6
      }, { status: 500 })
    }

    // Step 7: デフォルト送料設定確認
    try {
      const defaultShippingRate = await prisma.shippingRate.findFirst({
        where: { categoryId: null }
      })
      console.log('✅ Step 7 Passed: Shipping rate query', {
        found: !!defaultShippingRate,
        rate: defaultShippingRate
      })

      if (!defaultShippingRate) {
        return NextResponse.json({ 
          error: 'Step 7 Warning', 
          details: 'No default shipping rate found',
          step: 7
        }, { status: 400 })
      }

    } catch (error) {
      console.log('❌ Step 7 Failed: Shipping rate query error', error)
      return NextResponse.json({ 
        error: 'Step 7 Failed', 
        details: error instanceof Error ? error.message : String(error),
        step: 7
      }, { status: 500 })
    }

    // Step 8: 送料計算ライブラリテスト
    try {
      const { calculateShipping } = await import('@/lib/shipping-calculator')
      
      // カートアイテムを再取得（送料計算用）
      const cartItems = await prisma.cartItem.findMany({
        where: {
          customerId: session.user.id
        },
        include: {
          product: true
        }
      })

      const shippingCalculation = await calculateShipping(cartItems, prisma)
      console.log('✅ Step 8 Passed: Shipping calculation', shippingCalculation)

    } catch (error) {
      console.log('❌ Step 8 Failed: Shipping calculation error', error)
      return NextResponse.json({ 
        error: 'Step 8 Failed', 
        details: error instanceof Error ? error.message : String(error),
        step: 8,
        errorStack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }

    // ステップ9: Orderテーブル構造確認
    console.log('🔄 Step 9: Checking Order table structure...')
    
    try {
      // PostgreSQLでテーブル構造を確認
      const orderTableInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'Order' 
        ORDER BY ordinal_position;
      `
      console.log('📊 Order table structure:', orderTableInfo)
    } catch (structureError) {
      console.log('❌ Failed to get table structure:', structureError)
    }

    // ステップ10: 実際の注文作成テスト
    console.log('🔄 Step 10: Testing order creation...')
    
    try {
      const testOrderData = {
        customerId: session.user.id,
        orderNumber: `TEST-ORDER-${Date.now()}`,
        subtotalAmount: 100.0,
        shippingFee: 500.0,
        totalAmount: 600.0,
        shippingAddress: 'テスト住所',
        recipientName: 'テスト宛名',
        contactPhone: '090-1234-5678',
        notes: 'テスト注文',
        status: 'PENDING'
      }
      
      console.log('📝 Test order data:', testOrderData)
      
      const testOrder = await prisma.order.create({
        data: testOrderData
      })
      console.log('✅ Test order created:', testOrder.id)
      
      // テスト注文を削除
      await prisma.order.delete({
        where: { id: testOrder.id }
      })
      console.log('🗑️ Test order deleted')
    } catch (orderCreateError) {
      console.log('❌ Step 10 Failed: Order creation error', orderCreateError)
      return NextResponse.json({ 
        error: 'Step 10 Failed: Order creation', 
        details: orderCreateError instanceof Error ? orderCreateError.message : String(orderCreateError),
        step: 10,
        errorStack: orderCreateError instanceof Error ? orderCreateError.stack : undefined
      }, { status: 500 })
    }

    // All steps passed
    console.log('🎉 All debug steps passed!')
    return NextResponse.json({
      success: true,
      message: 'All debug steps passed successfully',
      stepsCompleted: 10,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Debug Order API Error:', error)
    return NextResponse.json(
      { 
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name || 'Unknown',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}