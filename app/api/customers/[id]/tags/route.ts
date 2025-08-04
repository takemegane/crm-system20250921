import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { logCustomerTagUpdate } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'EDIT_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return NextResponse.json(
        { error: 'Tag ID is required' },
        { status: 400 }
      )
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: params.id }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check if tag exists
    const tag = await prisma.tag.findUnique({
      where: { id: tagId }
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Check if association already exists
    const existingAssociation = await prisma.customerTag.findFirst({
      where: {
        customerId: params.id,
        tagId: tagId
      }
    })

    if (existingAssociation) {
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

    // Log the tag addition
    await logCustomerTagUpdate(
      session.user.id,
      params.id,
      oldTags.map(ct => ct.tag.name),
      newTags.map(ct => ct.tag.name),
      request
    )

    return NextResponse.json(customerTag, { status: 201 })
  } catch (error) {
    console.error('Error adding tag to customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}