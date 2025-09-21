"use client"
import { useMemo, useState, useEffect } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { getJstTodayDate } from '@/lib/date'
import { CalendarGrid } from './CalendarGrid'

function firstOfMonth(dateStr: string) {
  return dateStr.slice(0, 7) + '-01'
}

function addMonths(base: string, diff: number) {
  const d = new Date(base)
  d.setMonth(d.getMonth() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export function CalendarView({ initialMonth, customerId }: { initialMonth?: string; customerId?: string }) {
  const today = getJstTodayDate()
  const [month, setMonth] = useState<string>(initialMonth ? firstOfMonth(initialMonth) : firstOfMonth(today))
  const monthLabel = useMemo(() => formatInTimeZone(new Date(month), 'Asia/Tokyo', 'yyyy年M月'), [month])
  const thisMonth = firstOfMonth(today)
  const canNext = month < thisMonth
  const [count, setCount] = useState<number>(0)
  const [marked, setMarked] = useState<Set<string>>(new Set())

  async function fetchMonthData(m: string) {
    const d = new Date(m)
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const endDate = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(endDate).padStart(2, '0')}`
    const params = new URLSearchParams({ customer_id: customerId ?? 'me', since: start, until: end })
    const res = await fetch(`/api/entries?${params}`, { cache: 'no-store' })
    if (!res.ok) { setCount(0); setMarked(new Set()); return }
    const json = await res.json()
    const entries = Array.isArray(json.entries) ? json.entries : []
    setCount(entries.length)
    setMarked(new Set(entries.map((e: any) => String(e.entry_date).slice(0, 10))))
  }

  useMemo(() => { fetchMonthData(month); return undefined }, [month, customerId])

  useEffect(() => {
    if (initialMonth) setMonth(firstOfMonth(initialMonth))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMonth])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          className="px-3 py-2 rounded-md hover:bg-gray-50"
          aria-label="前の月"
          onClick={() => setMonth((m) => addMonths(m, -1))}
        >
          ← 前の月
        </button>
        <div className="flex flex-col items-center">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">今月の件数: {count} 件</div>
          <div className="mt-1 font-medium text-gray-700">{monthLabel}</div>
        </div>
        <button
          className="px-3 py-2 rounded-md disabled:opacity-50 hover:bg-gray-50"
          aria-label="次の月"
          onClick={() => setMonth((m) => addMonths(m, +1))}
          disabled={!canNext}
        >
          次の月 →
        </button>
      </div>
      <CalendarGrid month={month} today={today} marked={marked} />
    </div>
  )
}
