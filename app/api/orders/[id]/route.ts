import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { 
  unauthorizedResponse, 
  forbiddenResponse, 
  notFoundResponse,
  validationErrorResponse,
  internalServerErrorResponse,
  successResponse
} from '@/lib/api-responses'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return unauthorizedResponse()
    }

    const isCustomer = session.user?.userType === 'customer'
    const isAdmin = session.user?.userType === 'admin' && hasPermission(session.user.role as UserRole, 'VIEW_ORDERS')

    if (!isCustomer && !isAdmin) {
      return forbiddenResponse()
    }

    // 検索条件を設定（顧客は自分の注文のみ、管理者は全て）
    const where: any = { id: params.id }
    if (isCustomer) {
      where.customerId = session.user.id
    }
    
    const order = await prisma.order.findFirst({
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
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                isActive: true
              }
            }
          }
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })
    
    if (!order) {
      return notFoundResponse('注文が見つかりません')
    }
    
    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return internalServerErrorResponse()
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 PUT /api/orders/[id] called:', {
    orderId: params.id,
    url: request.url,
    method: request.method,
    timestamp: new Date().toISOString()
  })
  
  try {
    const session = await getServerSession(authOptions)
    console.log('🔐 Session info:', session ? { userType: session.user?.userType, id: session.user?.id } : 'null')
    
    if (!session) {
      console.log('❌ No session, returning unauthorized')
      return unauthorizedResponse()
    }

    const body = await request.json()
    console.log('📝 Request body:', body)
    const { action, status } = body

    // 顧客のキャンセルアクション
    if (action === 'cancel' && session.user?.userType === 'customer') {
      // 注文を取得し、キャンセル可能かチェック
      const order = await prisma.order.findUnique({
        where: { id: params.id },
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true
            }
          }
        }
      })

      if (!order) {
        return notFoundResponse('注文が見つかりません')
      }

      // 顧客は自分の注文のみキャンセル可能
      if (order.customerId !== session.user.id) {
        return forbiddenResponse('自分の注文のみキャンセル可能です')
      }

      // 既にキャンセルされている場合
      if (order.status === 'CANCELLED') {
        return validationErrorResponse('この注文は既にキャンセルされています')
      }

      // 出荷済み・完了の場合はキャンセル不可
      if (order.status === 'SHIPPED' || order.status === 'COMPLETED') {
        return validationErrorResponse('出荷済み・完了済みの注文はキャンセルできません')
      }

      // トランザクションでキャンセル処理
      const cancelledOrder = await prisma.$transaction(async (tx) => {
        // 注文をキャンセル
        const updatedOrder = await tx.order.update({
          where: { id: params.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelledBy: 'CUSTOMER',
            cancelReason: '顧客による注文キャンセル',
            updatedAt: new Date()
          }
        })

        // 在庫復元
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          })
        }

        return updatedOrder
      })

      console.log('✅ Customer cancel successful, returning response')
      return successResponse(cancelledOrder, '注文が正常にキャンセルされました')
    }

    // 管理者のステータス更新
    const isAdmin = session.user?.userType === 'admin' && hasPermission(session.user.role as UserRole, 'VIEW_ORDERS')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const validStatuses = ['PENDING', 'SHIPPED', 'BACKORDERED', 'CANCELLED', 'COMPLETED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // 注文を取得して存在確認
    const order = await prisma.order.findUnique({
      where: { id: params.id }
    })

    if (!order) {
      return notFoundResponse('注文が見つかりません')
    }

    // ステータス更新（キャンセルの場合は追加情報を記録）
    const updateData: any = {
      status,
      updatedAt: new Date()
    }

    if (status === 'CANCELLED') {
      updateData.cancelledAt = new Date()
      updateData.cancelledBy = 'ADMIN'
      updateData.cancelReason = '管理者による注文キャンセル'
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('❌ Error updating order:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return internalServerErrorResponse()
  }
}

// 緊急対応：DELETEメソッドでもキャンセル処理を実行
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('🚨 DELETE method called - executing cancel logic as emergency workaround:', {
    orderId: params.id,
    method: request.method,
    url: request.url
  })
  
  // PUTメソッドと同じキャンセル処理を実行
  try {
    const session = await getServerSession(authOptions)
    console.log('🔐 DELETE Session info:', session ? { userType: session.user?.userType, id: session.user?.id } : 'null')
    
    if (!session) {
      console.log('❌ DELETE No session, returning unauthorized')
      return unauthorizedResponse()
    }

    // 顧客のキャンセルアクション（DELETEメソッド用）
    if (session.user?.userType === 'customer') {
      // 注文を取得し、キャンセル可能かチェック
      const order = await prisma.order.findUnique({
        where: { id: params.id },
        include: {
          customer: true,
          orderItems: {
            include: {
              product: true
            }
          }
        }
      })

      if (!order) {
        return notFoundResponse('注文が見つかりません')
      }

      // 顧客は自分の注文のみキャンセル可能
      if (order.customerId !== session.user.id) {
        return forbiddenResponse('自分の注文のみキャンセル可能です')
      }

      // 既にキャンセルされている場合
      if (order.status === 'CANCELLED') {
        return validationErrorResponse('この注文は既にキャンセルされています')
      }

      // 出荷済み・完了の場合はキャンセル不可
      if (order.status === 'SHIPPED' || order.status === 'COMPLETED') {
        return validationErrorResponse('出荷済み・完了済みの注文はキャンセルできません')
      }

      // トランザクションでキャンセル処理
      const cancelledOrder = await prisma.$transaction(async (tx) => {
        // 注文をキャンセル
        const updatedOrder = await tx.order.update({
          where: { id: params.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelledBy: 'CUSTOMER',
            cancelReason: '顧客による注文キャンセル',
            updatedAt: new Date()
          }
        })

        // 在庫復元
        for (const item of order.orderItems) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          })
        }

        return updatedOrder
      })

      console.log('✅ DELETE Customer cancel successful, returning response')
      return successResponse(cancelledOrder, '注文が正常にキャンセルされました')
    }

    return forbiddenResponse('DELETE method not allowed for admin users')
  } catch (error) {
    console.error('❌ DELETE Error canceling order:', error)
    return internalServerErrorResponse()
  }
}

