import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'SEND_BULK_EMAIL')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      includeAll = false,
      selectedTagIds = [], 
      selectedCourseIds = [],
      selectedCustomerIds = []
    } = body

    let recipients: Array<{ id: string; name: string; email: string }> = []

    if (includeAll) {
      // 全顧客を取得（アーカイブ済みを除く）
      recipients = await prisma!.customer.findMany({
        where: {
          isArchived: false
        },
        select: {
          id: true,
          name: true,
          email: true
        },
        orderBy: {
          name: 'asc'
        }
      })
    } else {
      // 条件に基づいた顧客を取得
      const whereConditions: any[] = []

      // タグ条件
      if (selectedTagIds.length > 0) {
        whereConditions.push({
          customerTags: {
            some: {
              tagId: {
                in: selectedTagIds
              }
            }
          }
        })
      }

      // コース条件
      if (selectedCourseIds.length > 0) {
        whereConditions.push({
          enrollments: {
            some: {
              courseId: {
                in: selectedCourseIds
              },
              status: 'ACTIVE'
            }
          }
        })
      }

      // 個別選択条件
      if (selectedCustomerIds.length > 0) {
        whereConditions.push({
          id: {
            in: selectedCustomerIds
          }
        })
      }

      if (whereConditions.length > 0) {
        recipients = await prisma!.customer.findMany({
          where: {
            isArchived: false,
            OR: whereConditions
          },
          select: {
            id: true,
            name: true,
            email: true
          },
          orderBy: {
            name: 'asc'
          }
        })

        // 重複を削除
        const uniqueRecipients = recipients.reduce((acc, current) => {
          const exists = acc.find(item => item.id === current.id)
          if (!exists) {
            acc.push(current)
          }
          return acc
        }, [] as typeof recipients)
        
        recipients = uniqueRecipients
      }
    }

    return NextResponse.json({ 
      customers: recipients,
      count: recipients.length
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error previewing recipients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}