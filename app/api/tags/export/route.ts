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

    if (!session || !hasPermission(session.user.role as UserRole, 'EXPORT_TAGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // タグデータを取得（使用者数も含める）
    const tags = await prisma.tag.findMany({
      include: {
        customerTags: {
          where: {
            customer: {
              isArchived: false
            }
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // CSVヘッダー
    const headers = ['name', 'color', 'customerCount', 'createdAt']
    
    // CSVデータを構築
    const csvRows = [headers.join(',')]
    
    tags.forEach(tag => {
      const customerCount = tag.customerTags.length
      
      const row = [
        `"${tag.name}"`,
        `"${tag.color}"`,
        `"${customerCount}"`,
        `"${tag.createdAt.toISOString().split('T')[0]}"`
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
        'Content-Disposition': `attachment; filename=tags_${new Date().toISOString().split('T')[0]}.csv`
      }
    })

  } catch (error) {
    console.error('Error exporting tags CSV:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}