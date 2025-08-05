import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_TAGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tags = await prisma.tag.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        customerTags: {
          select: {
            id: true,
            customer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('Found tags:', tags.length)
    return NextResponse.json({ tags, total: tags.length })
  } catch (error) {
    console.error('Error fetching tags:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏷️ Tag creation API called')
    
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
    console.log('👤 Session user:', session?.user?.email || 'No session')

    if (!session || !hasPermission(session.user.role as UserRole, 'CREATE_TAGS')) {
      console.log('❌ Permission denied for user:', session?.user?.email, 'role:', session?.user?.role)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Request body:', body)
    const { name, color, description } = body

    if (!name) {
      console.log('❌ Tag name is missing')
      return NextResponse.json(
        { error: 'タグ名は必須です' },
        { status: 400 }
      )
    }

    console.log('🔍 Checking for existing tag with name:', name)
    const existingTag = await prisma.tag.findUnique({
      where: { name },
    })

    if (existingTag) {
      console.log('❌ Tag already exists:', existingTag.id)
      return NextResponse.json(
        { error: 'この名前のタグは既に存在します' },
        { status: 400 }
      )
    }

    console.log('✅ Creating new tag...')
    const tag = await prisma.tag.create({
      data: {
        name,
        color: color || '#3B82F6',
        description: description || null,
      },
    })

    console.log('✅ Tag created successfully:', tag.id)
    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating tag:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}