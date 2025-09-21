import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { jstStartOfUtc, jstTodayStartUtc } from '@/lib/date'
import { hasPermission, UserRole } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function parseParams(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') as '1m' | '3m' | '6m' | null
  const since = searchParams.get('since')
  const until = searchParams.get('until')
  const customerIdParam = searchParams.get('customer_id') || 'me'
  const format = searchParams.get('format')
  return { range, since, until, customerIdParam, format }
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { range, since, until, customerIdParam, format } = parseParams(request)

    // 参照対象の顧客ID決定
    const isCustomer = session.user.userType === 'customer' || session.user.role === 'CUSTOMER'
    const isAdmin = !isCustomer && hasPermission(session.user.role as UserRole, 'VIEW_CUSTOMERS')
    let targetCustomerId: string | null = null
    if (customerIdParam === 'me') {
      if (!isCustomer) {
        // 管理者が' me 'を指定した場合はエラーにする（明示ID指定を要求）
        return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
      }
      targetCustomerId = session.user.id
    } else {
      // 明示ID指定は管理者のみ許可
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      targetCustomerId = customerIdParam
    }

    if (!targetCustomerId) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
    }

    // 期間の決定
    let startDate: Date | null = null
    let endDate: Date | null = null
    if (range) {
      const months = range === '1m' ? 1 : range === '3m' ? 3 : 6
      const today = jstTodayStartUtc()
      const start = new Date(today)
      start.setMonth(start.getMonth() - months)
      startDate = start
      endDate = today
    } else if (since && until) {
      startDate = jstStartOfUtc(since)
      endDate = jstStartOfUtc(until)
    } else {
      // デフォルトは直近1ヶ月
      const today = jstTodayStartUtc()
      const start = new Date(today)
      start.setMonth(start.getMonth() - 1)
      startDate = start
      endDate = today
    }

    const entries = await prisma.entry.findMany({
      where: {
        customerId: targetCustomerId,
        entryDate: {
          gte: startDate!,
          lte: endDate!,
        },
      },
      select: { entryDate: true },
      orderBy: { entryDate: 'asc' },
    })

    const rows = entries.map((e) => ({ entry_date: ymd(e.entryDate) }))

    if (format === 'csv') {
      const lines = ['entry_date', ...rows.map((r) => r.entry_date)].join('\n')
      return new NextResponse(lines, {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
        },
      })
    }

    return NextResponse.json({ entries: rows })
  } catch (error) {
    console.error('GET /api/entries error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

