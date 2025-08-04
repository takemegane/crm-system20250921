import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import { logCustomerTagUpdate } from '@/lib/audit'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; tagId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'EDIT_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tags before deletion for audit log
    const oldTags = await prisma.customerTag.findMany({
      where: { customerId: params.id },
      include: { tag: true }
    })

    // Find and delete the customer-tag association
    const customerTag = await prisma.customerTag.findFirst({
      where: {
        customerId: params.id,
        tagId: params.tagId
      }
    })

    if (!customerTag) {
      return NextResponse.json(
        { error: 'Tag association not found' },
        { status: 404 }
      )
    }

    await prisma.customerTag.delete({
      where: { id: customerTag.id }
    })

    // Get tags after deletion for audit log
    const newTags = await prisma.customerTag.findMany({
      where: { customerId: params.id },
      include: { tag: true }
    })

    // Log the tag removal
    await logCustomerTagUpdate(
      session.user.id,
      params.id,
      oldTags.map(ct => ct.tag.name),
      newTags.map(ct => ct.tag.name),
      request
    )

    return NextResponse.json({ message: 'Tag removed successfully' })
  } catch (error) {
    console.error('Error removing tag from customer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}