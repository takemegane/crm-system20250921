import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
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

    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_TAGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tag = await prisma!.tag.findUnique({
      where: { id: params.id },
      include: {
        customerTags: {
          where: {
            customer: {
              isArchived: false
            }
          },
          include: {
            customer: true,
          },
        },
      },
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Error fetching tag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    if (!session || !hasPermission(session.user.role as UserRole, 'EDIT_TAGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color, description } = body

    if (!name) {
      return NextResponse.json(
        { error: 'タグ名は必須です' },
        { status: 400 }
      )
    }

    // Check if another tag with the same name exists
    const existingTag = await prisma!.tag.findFirst({
      where: {
        name,
        id: { not: params.id },
      },
    })

    if (existingTag) {
      return NextResponse.json(
        { error: 'この名前のタグは既に存在します' },
        { status: 400 }
      )
    }

    const tag = await prisma!.tag.update({
      where: { id: params.id },
      data: {
        name,
        color: color || '#3B82F6',
        description: description || null,
      },
    })

    return NextResponse.json(tag)
  } catch (error) {
    console.error('Error updating tag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    if (!session || !hasPermission(session.user.role as UserRole, 'DELETE_TAGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if tag has customer associations
    const customerTagsCount = await prisma!.customerTag.count({
      where: { 
        tagId: params.id,
        customer: {
          isArchived: false
        }
      },
    })

    if (customerTagsCount > 0) {
      return NextResponse.json(
        { error: 'このタグを使用している顧客が存在するため削除できません。先に顧客からタグを削除してください。' },
        { status: 400 }
      )
    }

    await prisma!.tag.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Tag deleted successfully' })
  } catch (error) {
    console.error('Error deleting tag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}