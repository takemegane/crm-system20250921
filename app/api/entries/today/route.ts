import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { jstTodayStartUtc } from '@/lib/date'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // 顧客のみ記録可能
    const isCustomer = session?.user?.userType === 'customer' || session?.user?.role === 'CUSTOMER'
    const customerId = isCustomer ? session?.user?.id : undefined
    if (!customerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const entryDate = jstTodayStartUtc()

    // まず作成を試み、ユニーク制約違反ならexistsを返す
    try {
      await prisma.entry.create({
        data: {
          customerId,
          entryDate,
        },
      })
      return NextResponse.json({ status: 'created' as const })
    } catch (e: any) {
      if (e?.code === 'P2002') {
        return NextResponse.json({ status: 'exists' as const })
      }
      console.error('Error creating entry:', e)
      return NextResponse.json({ error: 'Failed to create entry' }, { status: 400 })
    }
  } catch (error) {
    console.error('POST /api/entries/today error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

