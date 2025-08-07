import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { logCustomerUpdate, createAuditLog } from '@/lib/audit'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    if (!session || !hasPermission(session.user.role as UserRole, 'VIEW_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        enrollments: {
          include: {
            course: true,
          },
          orderBy: {
            enrolledAt: 'desc',
          },
        },
        customerTags: {
          include: {
            tag: true,
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error fetching customer:', error)
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

    const body = await request.json()
    const { name, nameKana, email, phone, address, birthDate, gender, joinedAt, courseIds = [], tagIds = [] } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        email,
        NOT: { id: params.id },
      },
    })

    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this email already exists' },
        { status: 400 }
      )
    }

    // Get old data for audit log
    const oldCustomer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        enrollments: { include: { course: true } },
        customerTags: { include: { tag: true } }
      }
    })

    if (!oldCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
        name,
        nameKana: nameKana || null,
        email,
        phone: phone || null,
        address: address || null,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender: gender || null,
        joinedAt: joinedAt ? new Date(joinedAt) : undefined,
      },
    })

    // コースの申し込みを更新
    // 既存の申し込みを削除してから新しく作成
    await prisma.enrollment.deleteMany({
      where: { customerId: params.id },
    })

    if (courseIds.length > 0) {
      const enrollments = courseIds.map((courseId: string) => ({
        customerId: params.id,
        courseId,
        enrolledAt: joinedAt ? new Date(joinedAt) : new Date(),
      }))

      await prisma.enrollment.createMany({
        data: enrollments,
      })
    }

    // タグの関連付けを更新
    // 既存のタグ関連付けを削除してから新しく作成
    await prisma.customerTag.deleteMany({
      where: { customerId: params.id },
    })

    if (tagIds.length > 0) {
      const customerTags = tagIds.map((tagId: string) => ({
        customerId: params.id,
        tagId,
      }))

      await prisma.customerTag.createMany({
        data: customerTags,
      })
    }

    // Log the update
    await logCustomerUpdate(
      session.user.id, 
      params.id, 
      {
        name: oldCustomer.name,
        email: oldCustomer.email,
        phone: oldCustomer.phone,
        address: oldCustomer.address,
        joinedAt: oldCustomer.joinedAt,
        courses: oldCustomer.enrollments.map(e => e.course.name),
        tags: oldCustomer.customerTags.map(t => t.tag.name)
      },
      {
        name,
        email,
        phone,
        address,
        joinedAt,
        courseIds,
        tagIds
      },
      request
    )

    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error updating customer:', error)
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

    if (!session || !hasPermission(session.user.role as UserRole, 'DELETE_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 削除前の顧客情報を取得
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    await prisma.customer.delete({
      where: { id: params.id },
    })

    // 削除の監査ログを記録
    try {
      await createAuditLog({
        userId: session.user.id,
        action: 'DELETE',
        entity: 'CUSTOMER',
        entityId: params.id,
        oldData: customer,
        request
      })
      console.log('✅ Delete audit log created for customer:', params.id)
    } catch (auditError) {
      console.error('❌ Failed to create delete audit log:', auditError)
      // 監査ログのエラーは処理を止めない
    }

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}