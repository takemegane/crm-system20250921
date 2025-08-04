import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_COURSES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Courses API GET request received')
    const courses = await prisma.course.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log('Found courses:', courses.length)
    return NextResponse.json({ courses, total: courses.length })
  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'CREATE_COURSES')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, price, duration } = body

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

    const course = await prisma.course.create({
      data: {
        name,
        description: description || null,
        price,
        duration: duration || null,
      },
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    console.error('Error creating course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}