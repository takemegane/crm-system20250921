import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    console.log('📚 Courses list API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    // 認証チェック
    const session = await getServerSession(authOptions)
    console.log('👤 Session user:', session?.user?.email || 'No session', 'role:', session?.user?.role)
    
    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_COURSES')) {
      console.log('❌ Permission denied')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    console.log('✅ Permission check passed')

    // 全てのアクティブなコースを取得
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    })

    console.log(`✅ Found ${courses.length} active courses`)

    return NextResponse.json({
      courses: courses.map(course => ({
        id: course.id,
        name: course.name,
        description: course.description,
        price: course.price,
        duration: course.duration
      }))
    })

  } catch (error) {
    console.error('❌ Error getting courses list:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}