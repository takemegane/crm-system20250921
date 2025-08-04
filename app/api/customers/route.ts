import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

    // Prismaクライアントの存在確認
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }


    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')
    const courseId = searchParams.get('courseId')

    let whereClause: any = {
      isArchived: false // アーカイブされた顧客を除外
    }
    
    if (tagId) {
      whereClause = {
        ...whereClause,
        customerTags: {
          some: {
            tagId: tagId
          }
        }
      }
    }
    
    if (courseId) {
      whereClause = {
        ...whereClause,
        enrollments: {
          some: {
            courseId: courseId
          }
        }
      }
    }

    const customers = await prisma!.customer.findMany({
      where: whereClause,
      include: {
        enrollments: {
          include: {
            course: true,
          },
        },
        customerTags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ customers, total: customers.length })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    if (!session || !hasPermission(session.user.role as UserRole, 'CREATE_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, nameKana, email, phone, address, birthDate, gender, joinedAt, courseIds = [], tagIds = [] } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const existingCustomer = await prisma!.customer.findUnique({
      where: { email },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 400 }
      )
    }

    const customer = await prisma!.customer.create({
      data: {
        name,
        nameKana: nameKana || null,
        email,
        phone: phone || null,
        address: address || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
      },
    })

    // コースの申し込みを作成
    if (courseIds.length > 0) {
      const enrollments = courseIds.map((courseId: string) => ({
        customerId: customer.id,
        courseId,
        enrolledAt: joinedAt ? new Date(joinedAt) : new Date(),
      }))

      await prisma!.enrollment.createMany({
        data: enrollments,
      })
    }

    // タグの関連付けを作成
    if (tagIds.length > 0) {
      const customerTags = tagIds.map((tagId: string) => ({
        customerId: customer.id,
        tagId,
      }))

      await prisma!.customerTag.createMany({
        data: customerTags,
      })
    }

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}