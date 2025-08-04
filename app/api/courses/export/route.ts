import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'EXPORT_COURSES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // コースデータを取得（登録者数も含める）
    const courses = await prisma!.course.findMany({
      include: {
        enrollments: {
          where: {
            customer: {
              isArchived: false
            }
          },
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // CSVヘッダー
    const headers = ['name', 'description', 'price', 'duration', 'isActive', 'enrolledCount', 'createdAt']
    
    // CSVデータを構築
    const csvRows = [headers.join(',')]
    
    courses.forEach(course => {
      const enrolledCount = course.enrollments.filter(e => e.status === 'ENROLLED').length
      
      const row = [
        `"${course.name}"`,
        `"${course.description || ''}"`,
        `"${course.price}"`,
        `"${course.duration || ''}"`,
        `"${course.isActive ? 'アクティブ' : '非アクティブ'}"`,
        `"${enrolledCount}"`,
        `"${course.createdAt.toISOString().split('T')[0]}"`
      ]
      csvRows.push(row.join(','))
    })

    const csvContent = csvRows.join('\n')
    
    // BOM付きUTF-8でCSVを生成
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename=courses_${new Date().toISOString().split('T')[0]}.csv`
      }
    })

  } catch (error) {
    console.error('Error exporting courses CSV:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}