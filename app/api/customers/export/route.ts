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

    if (!session || !hasPermission(session.user.role as UserRole, 'EXPORT_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URLパラメータからtagIdを取得
    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')

    // 顧客データを取得（コースとタグの情報も含める）
    const whereClause = tagId 
      ? {
          customerTags: {
            some: {
              tagId: tagId
            }
          }
        }
      : {}

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        enrollments: {
          include: {
            course: {
              select: {
                name: true
              }
            }
          }
        },
        customerTags: {
          include: {
            tag: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    // CSVヘッダー（フリガナ、生年月日、性別を追加）
    const headers = ['name', 'nameKana', 'email', 'phone', 'address', 'birthDate', 'gender', 'joinedAt', 'courses', 'tags']
    
    // CSVデータを構築
    const csvRows = [headers.join(',')]
    
    customers.forEach(customer => {
      const courses = customer.enrollments.map(e => e.course.name).join(';')
      const tags = customer.customerTags.map(ct => ct.tag.name).join(';')
      
      const row = [
        `"${customer.name}"`,
        `"${customer.nameKana || ''}"`,
        `"${customer.email}"`,
        `"${customer.phone || ''}"`,
        `"${customer.address || ''}"`,
        `"${customer.birthDate ? customer.birthDate.toISOString().split('T')[0] : ''}"`,
        `"${customer.gender || ''}"`,
        `"${customer.joinedAt.toISOString().split('T')[0]}"`,
        `"${courses}"`,
        `"${tags}"`
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
        'Content-Disposition': `attachment; filename=customers_${new Date().toISOString().split('T')[0]}.csv`
      }
    })

  } catch (error) {
    console.error('Error exporting customers CSV:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}