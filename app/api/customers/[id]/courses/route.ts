import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { logCustomerCourseUpdate } from '@/lib/audit'

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

    if (!session || !hasPermission(session.user.role as UserRole, 'EDIT_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId } = body

    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      )
    }

    // Check if customer exists
    const customer = await prisma!.customer.findUnique({
      where: { id: params.id }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if course exists and is active
    const course = await prisma!.course.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!course.isActive) {
      return NextResponse.json({ error: 'Course is not active' }, { status: 400 })
    }

    // Check if enrollment already exists
    const existingEnrollment = await prisma!.enrollment.findFirst({
      where: {
        customerId: params.id,
        courseId: courseId
      }
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Customer is already enrolled in this course' },
        { status: 400 }
      )
    }

    // Get courses before enrollment for audit log
    const oldEnrollments = await prisma!.enrollment.findMany({
      where: { customerId: params.id },
      include: { course: true }
    })

    // Create enrollment
    const enrollment = await prisma!.enrollment.create({
      data: {
        customerId: params.id,
        courseId: courseId,
        enrolledAt: new Date(),
        status: 'ENROLLED'
      }
    })

    // Get courses after enrollment for audit log
    const newEnrollments = await prisma!.enrollment.findMany({
      where: { customerId: params.id },
      include: { course: true }
    })

    // Log the course enrollment
    await logCustomerCourseUpdate(
      session.user.id,
      params.id,
      oldEnrollments.map(e => e.course.name),
      newEnrollments.map(e => e.course.name),
      request
    )

    return NextResponse.json(enrollment, { status: 201 })
  } catch (error) {
    console.error('Error enrolling customer in course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}