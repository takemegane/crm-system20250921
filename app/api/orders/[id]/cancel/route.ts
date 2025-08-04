import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { 
  unauthorizedResponse, 
  forbiddenResponse, 
  validationErrorResponse,
  notFoundResponse,
  internalServerErrorResponse,
  successResponse
} from '@/lib/api-responses'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの存在確認
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }


    const session = await getServerSession(authOptions)
    
    if (!session) {
      return unauthorizedResponse()
    }

    const orderId = params.id

    // 注文を取得し、キャンセル可能かチェック
    const order = await prisma!.order.findUnique({
      where: { id: orderId },
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
    if (session.user.userType === 'customer' && order.customerId !== session.user.id) {
      return forbiddenResponse('自分の注文のみキャンセル可能です')
    }

    // 既にキャンセルされている場合
    if (order.status === 'CANCELLED') {
      return validationErrorResponse('この注文は既にキャンセルされています')
    }

    // 出荷済みの場合はキャンセル不可
    if (order.status === 'SHIPPED') {
      return validationErrorResponse('出荷済みの注文はキャンセルできません')
    }

    // トランザクションでキャンセル処理
    const cancelledOrder = await prisma!.$transaction(async (tx) => {
      // 注文をキャンセル
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: session.user.userType === 'customer' ? 'CUSTOMER' : 'ADMIN',
          cancelReason: session.user.userType === 'customer' ? '顧客による注文キャンセル' : '管理者による注文キャンセル',
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

    return successResponse(cancelledOrder, '注文が正常にキャンセルされました')
  } catch (error) {
    console.error('Error cancelling order:', error)
    return internalServerErrorResponse('注文のキャンセルに失敗しました')
  }
}