import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
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

    if (!session?.user?.role || !hasPermission(session.user.role as UserRole, 'ARCHIVE_CUSTOMERS')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const customer = await prisma!.customer.findUnique({
      where: { id: params.id }
    })

    if (!customer) {
      return new NextResponse('Customer not found', { status: 404 })
    }

    const updatedCustomer = await prisma!.customer.update({
      where: { id: params.id },
      data: {
        isArchived: true,
        archivedAt: new Date()
      }
    })

    return NextResponse.json(updatedCustomer)
  } catch (error) {
    console.error('Error archiving customer:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}