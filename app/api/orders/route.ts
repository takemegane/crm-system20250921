import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { calculateShipping } from '@/lib/shipping-calculator'
import { 
  unauthorizedResponse, 
  forbiddenResponse, 
  validationErrorResponse,
  internalServerErrorResponse,
  paginatedResponse,
  successResponse
} from '@/lib/api-responses'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
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
    
    if (!session) {
      return unauthorizedResponse()
    }

    // 顧客の場合は自分の注文のみ、管理者は全ての注文を取得
    const isCustomer = session.user?.userType === 'customer'
    const isAdmin = session.user?.userType === 'admin' && hasPermission(session.user.role as UserRole, 'VIEW_ORDERS')

    if (!isCustomer && !isAdmin) {
      return forbiddenResponse()
    }
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    
    const skip = (page - 1) * limit

    // 検索条件の構築
    const where: any = {}
    
    if (isCustomer) {
      // 顧客の場合は自分の注文のみ
      where.customerId = session.user.id
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { email: { contains: search } } }
      ]
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          subtotalAmount: true,
          shippingFee: true,
          totalAmount: true,
          status: true,
          shippingAddress: true,
          recipientName: true,
          contactPhone: true,
          notes: true,
          orderedAt: true,
          cancelledAt: true,
          cancelledBy: true,
          cancelReason: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          orderItems: {
            select: {
              id: true,
              productName: true,
              price: true,
              quantity: true,
              subtotal: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true
                }
              }
            }
          }
        },
        orderBy: { orderedAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ])

    const totalPages = Math.ceil(total / limit)
    
    return paginatedResponse(orders, page, totalPages, total, 'orders')
  } catch (error) {
    console.error('Error fetching orders:', error)
    return internalServerErrorResponse('注文一覧の取得に失敗しました')
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 Order creation API called')
    
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
    console.log('👤 Session user:', session?.user?.email || 'No session', 'userType:', session?.user?.userType)
    
    // 顧客のみ注文作成可能
    if (!session || session.user.userType !== 'customer') {
      console.log('❌ Permission denied - not a customer')
      return forbiddenResponse('顧客のみ注文を作成できます')
    }
    
    console.log('✅ Permission check passed')
    
    const body = await request.json()
    console.log('📝 Request body received:', JSON.stringify(body, null, 2))
    
    const { shippingAddress, recipientName, contactPhone, notes } = body
    console.log('🔍 Extracted fields:')
    console.log('  - shippingAddress:', shippingAddress)
    console.log('  - recipientName:', recipientName)
    console.log('  - contactPhone:', contactPhone)
    console.log('  - notes:', notes)
    
    // バリデーション
    console.log('🔍 Starting validation...')
    if (!shippingAddress || shippingAddress.trim() === '') {
      console.log('❌ Validation failed: Missing shipping address')
      return validationErrorResponse('配送先住所は必須です')
    }
    
    if (!recipientName || recipientName.trim() === '') {
      console.log('❌ Validation failed: Missing recipient name')
      return validationErrorResponse('宛名は必須です')
    }
    
    console.log('✅ Basic validation passed')
    
    // カートアイテムを取得
    console.log('🛒 Fetching cart items for customer:', session.user.id)
    const cartItems = await prisma.cartItem.findMany({
      where: {
        customerId: session.user.id
      },
      include: {
        product: true
      }
    })
    
    console.log('📦 Cart items found:', cartItems.length)
    console.log('📦 Cart items details:', cartItems.map(item => ({
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      stock: item.product.stock,
      isActive: item.product.isActive
    })))
    
    if (cartItems.length === 0) {
      console.log('❌ Cart is empty')
      return validationErrorResponse('カートが空です')
    }
    
    // 在庫確認
    console.log('📦 Checking inventory...')
    for (const item of cartItems) {
      if (!item.product.isActive) {
        console.log('❌ Product not active:', item.product.name)
        return validationErrorResponse(`商品「${item.product.name}」は現在利用できません`)
      }
      
      if (item.product.stock < item.quantity) {
        console.log('❌ Insufficient stock:', item.product.name, 'requested:', item.quantity, 'available:', item.product.stock)
        return validationErrorResponse(`商品「${item.product.name}」の在庫が不足しています`)
      }
    }
    
    console.log('✅ Inventory check passed')
    
    // 統一送料計算関数を使用（Prismaクライアントを渡す）
    console.log('💰 Calculating shipping...')
    const shippingCalculation = await calculateShipping(cartItems, prisma)
    const { subtotalAmount, shippingFee, totalAmount } = shippingCalculation
    console.log('💰 Shipping calculation result:', { subtotalAmount, shippingFee, totalAmount })
    
    // 注文番号生成
    const orderNumber = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    console.log('🔢 Generated order number:', orderNumber)
    
    // トランザクションで注文作成と在庫更新
    console.log('🔄 Starting transaction...')
    const order = await prisma.$transaction(async (tx) => {
      // 注文作成
      console.log('📝 Creating order...')
      const orderData = {
        customerId: session.user.id,
        orderNumber,
        subtotalAmount,
        shippingFee,
        totalAmount,
        shippingAddress, // Prismaスキーマに合わせてshippingAddress使用
        recipientName,
        contactPhone, // Prismaスキーマに合わせてcontactPhoneのみ使用
        notes,
        status: 'PENDING'
      }
      console.log('📝 Order data:', JSON.stringify(orderData, null, 2))
      
      const newOrder = await tx.order.create({
        data: orderData
      })
      console.log('✅ Order created with ID:', newOrder.id)
      
      // 注文アイテム作成と在庫更新
      console.log('📦 Creating order items and updating inventory...')
      for (const item of cartItems) {
        console.log(`📦 Processing item: ${item.product.name}`)
        
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
        console.log(`✅ Order item created for: ${item.product.name}`)
        
        // 在庫更新
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
        console.log(`✅ Stock updated for: ${item.product.name}, decremented by: ${item.quantity}`)
      }
      
      // カートクリア
      console.log('🛒 Clearing cart...')
      await tx.cartItem.deleteMany({
        where: {
          customerId: session.user.id
        }
      })
      console.log('✅ Cart cleared')
      
      return newOrder
    })
    
    console.log('✅ Transaction completed successfully')
    
    // 作成された注文を詳細情報付きで取得
    const orderWithDetails = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        }
      }
    })
    
    console.log('🎉 Order creation completed successfully')
    return NextResponse.json(orderWithDetails, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating order:', error)
    console.error('❌ Error type:', typeof error)
    console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error))
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      errorType: error?.constructor?.name || 'Unknown'
    })
    
    // より詳細なエラーレスポンス
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}