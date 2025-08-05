import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { logCustomerTagUpdate } from '@/lib/audit'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔗 Customer tag association API called for customer:', params.id)
    
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

    if (!session || !hasPermission(session.user.role as UserRole, 'EDIT_CUSTOMERS')) {
      console.log('❌ Permission denied for user:', session?.user?.email, 'role:', session?.user?.role)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Request body:', body)
    const { tagId } = body

    if (!tagId) {
      console.log('❌ Tag ID is missing')
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Checking if customer exists:', params.id)
    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: params.id }
    })

    if (!customer) {
      console.log('❌ Customer not found:', params.id)
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    console.log('🔍 Checking if tag exists:', tagId)
    // Check if tag exists
    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    })

    if (!tag) {
      console.log('❌ Tag not found:', tagId)
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    console.log('🔍 Checking for existing association')
    // Check if association already exists
    const existingAssociation = await prisma.customerTag.findFirst({
      where: {
        customerId: params.id,
        tagId: tagId
      }
    })

    if (existingAssociation) {
      console.log('❌ Tag already associated with customer')
      return NextResponse.json(
        { error: 'Tag already associated with customer' },
        { status: 400 }
      )
    }

    // Get tags before and after for audit log
    const oldTags = await prisma.customerTag.findMany({
      where: { customerId: params.id },
      include: { tag: true }
    })

    console.log('✅ Creating tag association...')
    // Create association
    const customerTag = await prisma.customerTag.create({
      data: {
        customerId: params.id,
        tagId: tagId
      }
    })

    const newTags = await prisma.customerTag.findMany({
      where: { customerId: params.id },
      include: { tag: true }
    })

    console.log('📝 Logging tag update...')
    // Log the tag addition
    await logCustomerTagUpdate(
      session.user.id,
      params.id,
      oldTags.map(ct => ct.tag.name),
      newTags.map(ct => ct.tag.name),
      request
    )

    console.log('✅ Tag association created successfully:', customerTag.id)
    return NextResponse.json(customerTag, { status: 201 })
  } catch (error) {
    console.error('❌ Error adding tag to customer:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}