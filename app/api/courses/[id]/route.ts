import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_COURSES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        enrollments: {
          where: {
            customer: {
              isArchived: false
            }
          },
          include: {
            customer: true,
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json(course)
  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'EDIT_COURSES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, price, duration, isActive } = body

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: 'コース名と料金は必須です' },
        { status: 400 }
      )
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { error: '料金は0以上の数値で入力してください' },
        { status: 400 }
      )
    }

    const course = await prisma.course.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
        price,
        duration: duration || null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json(course)
  } catch (error) {
    console.error('Error updating course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'DELETE_COURSES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if course has enrollments
    const enrollmentsCount = await prisma.enrollment.count({
      where: { 
        courseId: params.id,
        customer: {
          isArchived: false
        }
      },
    })

    if (enrollmentsCount > 0) {
      return NextResponse.json(
        { error: 'このコースに申し込んでいる顧客が存在するため削除できません。先に顧客の申し込みを解除してください。' },
        { status: 400 }
      )
    }

    await prisma.course.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Error deleting course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}