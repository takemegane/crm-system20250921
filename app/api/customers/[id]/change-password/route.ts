import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

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

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }


    const session = await getServerSession(authOptions)
    
    // 管理者権限のチェック（管理者・オーナーのみ）
    if (!session || !hasPermission(session.user.role as UserRole, 'CHANGE_CUSTOMER_PASSWORD')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { newPassword } = body

    // バリデーション
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'パスワードは6文字以上で入力してください' },
        { status: 400 }
      )
    }

    // 顧客の存在確認
    const customer = await prisma.customer.findUnique({
      where: { id: params.id }
    })

    if (!customer) {
      return NextResponse.json(
        { error: '顧客が見つかりません' },
        { status: 404 }
      )
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // 顧客のパスワードを更新（ECユーザーフラグも有効化）
    await prisma.customer.update({
      where: { id: params.id },
      data: {
        password: hashedPassword,
        isECUser: true  // パスワード設定時にECユーザーとして有効化
      }
    })

    // 監査ログの記録（セッションユーザーの存在確認）
    const sessionUser = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (sessionUser) {
      await prisma.auditLog.create({
        data: {
          userId: sessionUser.id,
          action: 'UPDATE',
          entity: 'CUSTOMER',
          entityId: params.id,
          newData: JSON.stringify({
            field: 'password',
            admin: session.user.name,
            customer: customer.name
          })
        }
      })
    }

    return NextResponse.json({ 
      message: 'パスワードが正常に変更されました' 
    })
  } catch (error) {
    console.error('Error changing customer password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}