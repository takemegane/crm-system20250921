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

    // ADMIN and OWNER can access audit logs
    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_AUDIT_LOGS')) {
      return NextResponse.json({ error: 'Unauthorized - Audit logs access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const entity = searchParams.get('entity')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    // Build filter conditions
    const where: any = {}
    
    if (action) {
      where.action = action
    }
    
    if (userId) {
      where.userId = userId
    }
    
    if (entity) {
      where.entity = entity
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    // 顧客名を取得するため、CUSTOMERエンティティのログについて顧客情報を追加
    const enrichedAuditLogs = await Promise.all(
      auditLogs.map(async (log) => {
        if (log.entity === 'CUSTOMER' && log.entityId) {
          try {
            const customer = await prisma.customer.findUnique({
              where: { id: log.entityId },
              select: { name: true }
            })
            return {
              ...log,
              customerName: customer?.name || null
            }
          } catch (error) {
            // 顧客が見つからない場合はnullを設定
            return {
              ...log,
              customerName: null
            }
          }
        }
        return {
          ...log,
          customerName: null
        }
      })
    )

    return NextResponse.json({
      auditLogs: enrichedAuditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}