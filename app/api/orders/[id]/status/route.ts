import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { 
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
    
    if (!session || session.user.userType !== 'admin') {
      return forbiddenResponse('管理者権限が必要です')
    }

    if (!hasPermission(session.user.role as UserRole, 'EDIT_ORDERS')) {
      return forbiddenResponse('注文編集権限がありません')
    }

    const orderId = params.id
    const body = await request.json()
    const { status } = body

    // 有効なステータスをチェック
    const validStatuses = ['PENDING', 'SHIPPED', 'BACKORDERED', 'CANCELLED', 'COMPLETED']
    if (!validStatuses.includes(status)) {
      return validationErrorResponse('無効なステータスです')
    }

    // 注文を取得
    const order = await prisma!.order.findUnique({
      where: { id: orderId }
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

    const updatedOrder = await prisma!.order.update({
      where: { id: orderId },
      data: updateData
    })

    return successResponse(updatedOrder, '注文ステータスが正常に更新されました')
  } catch (error) {
    console.error('Error updating order status:', error)
    return internalServerErrorResponse('注文ステータスの更新に失敗しました')
  }
}