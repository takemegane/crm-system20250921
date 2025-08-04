import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { logCustomerCourseUpdate } from '@/lib/audit'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; enrollmentId: string } }
) {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'EDIT_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find and verify the enrollment belongs to the customer
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: params.enrollmentId,
        customerId: params.id
      },
      include: { course: true }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      )
    }

    // Get courses before deletion for audit log
    const oldEnrollments = await prisma.enrollment.findMany({
      where: { customerId: params.id },
      include: { course: true }
    })

    await prisma.enrollment.delete({
      where: { id: params.enrollmentId }
    })

    // Get courses after deletion for audit log
    const newEnrollments = await prisma.enrollment.findMany({
      where: { customerId: params.id },
      include: { course: true }
    })

    // Log the course deletion
    await logCustomerCourseUpdate(
      session.user.id,
      params.id,
      oldEnrollments.map(e => e.course.name),
      newEnrollments.map(e => e.course.name),
      request
    )

    return NextResponse.json({ message: 'Enrollment removed successfully' })
  } catch (error) {
    console.error('Error removing enrollment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}