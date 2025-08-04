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
    
    // 顧客のみ注文作成可能
    if (!session || session.user.userType !== 'customer') {
      return forbiddenResponse('顧客のみ注文を作成できます')
    }
    
    const body = await request.json()
    const { shippingAddress, recipientName, contactPhone, notes } = body
    
    // バリデーション
    if (!shippingAddress || shippingAddress.trim() === '') {
      return validationErrorResponse('配送先住所は必須です')
    }
    
    if (!recipientName || recipientName.trim() === '') {
      return validationErrorResponse('宛名は必須です')
    }
    
    // カートアイテムを取得
    const cartItems = await prisma.cartItem.findMany({
      where: {
        customerId: session.user.id
      },
      include: {
        product: true
      }
    })
    
    if (cartItems.length === 0) {
      return validationErrorResponse('カートが空です')
    }
    
    // 在庫確認
    for (const item of cartItems) {
      if (!item.product.isActive) {
        return validationErrorResponse(`商品「${item.product.name}」は現在利用できません`)
      }
      
      if (item.product.stock < item.quantity) {
        return validationErrorResponse(`商品「${item.product.name}」の在庫が不足しています`)
      }
    }
    
    // 統一送料計算関数を使用
    const shippingCalculation = await calculateShipping(cartItems)
    const { subtotalAmount, shippingFee, totalAmount } = shippingCalculation
    
    // 注文番号生成
    const orderNumber = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    // トランザクションで注文作成と在庫更新
    const order = await prisma.$transaction(async (tx) => {
      // 注文作成
      const newOrder = await tx.order.create({
        data: {
          customerId: session.user.id,
          orderNumber,
          subtotalAmount,
          shippingFee,
          totalAmount,
          shippingAddress,
          recipientName,
          contactPhone,
          notes,
          status: 'PENDING'
        }
      })
      
      // 注文アイテム作成と在庫更新
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
        
        // 在庫更新
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
      }
      
      // カートクリア
      await tx.cartItem.deleteMany({
        where: {
          customerId: session.user.id
        }
      })
      
      return newOrder
    })
    
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
    
    return NextResponse.json(orderWithDetails, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    return internalServerErrorResponse('注文の作成に失敗しました')
  }
}