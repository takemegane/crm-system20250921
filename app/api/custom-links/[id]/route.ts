import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_CUSTOM_LINKS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customLink = await prisma.customLink.findUnique({
      where: { id: params.id }
    })

    if (!customLink) {
      return NextResponse.json({ error: 'カスタムリンクが見つかりません' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: customLink
    })

  } catch (error) {
    console.error('Error fetching custom link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_CUSTOM_LINKS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, url, sortOrder } = body

    // バリデーション
    if (!name || !url) {
      return NextResponse.json({ error: 'リンク名とURLは必須です' }, { status: 400 })
    }

    // URL形式の簡単なバリデーション
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: '有効なURLを入力してください' }, { status: 400 })
    }

    const existingLink = await prisma.customLink.findUnique({
      where: { id: params.id }
    })

    if (!existingLink) {
      return NextResponse.json({ error: 'カスタムリンクが見つかりません' }, { status: 404 })
    }

    const updatedLink = await prisma.customLink.update({
      where: { id: params.id },
      data: {
        name,
        url,
        icon: '🔗',
        sortOrder: sortOrder !== undefined ? sortOrder : existingLink.sortOrder,
        isActive: true,
        isExternal: true,
        openInNewTab: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedLink
    })

  } catch (error) {
    console.error('Error updating custom link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_CUSTOM_LINKS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingLink = await prisma.customLink.findUnique({
      where: { id: params.id }
    })

    if (!existingLink) {
      return NextResponse.json({ error: 'カスタムリンクが見つかりません' }, { status: 404 })
    }

    await prisma.customLink.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'カスタムリンクが削除されました'
    })

  } catch (error) {
    console.error('Error deleting custom link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}