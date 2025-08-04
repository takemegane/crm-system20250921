import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
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

    // ADMIN and OWNER can restore customers
    if (!session || !hasPermission(session.user.role as UserRole, 'RESTORE_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized - Customer restore access required' }, { status: 403 })
    }

    const customerId = params.id

    // Check if customer exists
    const customer = await prisma!.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if customer is archived
    if (!customer.isArchived) {
      return NextResponse.json({ error: 'Customer is not archived' }, { status: 400 })
    }

    // Restore customer
    const restoredCustomer = await prisma!.customer.update({
      where: { id: customerId },
      data: {
        isArchived: false,
        archivedAt: null
      }
    })

    // Create audit log
    await prisma!.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'RESTORE',
        entity: 'CUSTOMER',
        entityId: customerId,
        newData: JSON.stringify({ isArchived: false, archivedAt: null })
      }
    })

    return NextResponse.json(restoredCustomer)
  } catch (error) {
    console.error('Error restoring customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}