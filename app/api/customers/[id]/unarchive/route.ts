import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 Customer unarchive API called for ID:', params.id)
    
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

    // ADMIN and OWNER can restore customers
    if (!session || !hasPermission(session.user.role as UserRole, 'RESTORE_CUSTOMERS')) {
      console.log('❌ Permission denied for user:', session?.user?.email, 'role:', session?.user?.role)
      return NextResponse.json({ error: 'Unauthorized - Customer restore access required' }, { status: 403 })
    }

    console.log('✅ Permission check passed')

    const customerId = params.id
    console.log('🔍 Checking customer:', customerId)

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId }
    })

    if (!customer) {
      console.log('❌ Customer not found:', customerId)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    console.log('✅ Customer found:', customer.name, 'isArchived:', customer.isArchived)

    // Check if customer is archived
    if (!customer.isArchived) {
      console.log('❌ Customer is not archived')
      return NextResponse.json({ error: 'Customer is not archived' }, { status: 400 })
    }

    console.log('🔄 Restoring customer...')

    // Restore customer
    const restoredCustomer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        isArchived: false,
        archivedAt: null
      }
    })

    console.log('✅ Customer restored successfully')

    // Create audit log
    console.log('📝 Creating audit log...')
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        userName: session.user.name || session.user.email || 'Unknown',
        action: 'RESTORE',
        entity: 'CUSTOMER',
        entityId: customerId,
        newData: JSON.stringify({ isArchived: false, archivedAt: null })
      }
    })

    console.log('✅ Audit log created')
    console.log('🎉 Customer unarchive completed successfully')

    return NextResponse.json(restoredCustomer)
  } catch (error) {
    console.error('❌ Error restoring customer:', error)
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}