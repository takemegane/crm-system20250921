"use client"
import { useEffect, useState } from 'react'
import { getJstTodayDate, startOfMonthJst, endOfMonthJst, toISODate } from '@/lib/date'

type Props = {
  month?: string // YYYY-MM-01 (JST)
  today?: string // YYYY-MM-DD (JST)
  marked?: Set<string>
}

export function CalendarGrid({ month, today = getJstTodayDate(), marked }: Props) {
  const [todayStatus, setTodayStatus] = useState<'idle' | 'loading' | 'created' | 'exists'>('idle')

  useEffect(() => {
    // 今月データを取得して今日の状態をチェック
    fetch('/api/entries?range=1m&customer_id=me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const jst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
        const iso = jst.toISOString().slice(0, 10)
        if (data.entries?.some((e: any) => (e.entry_date as string).slice(0, 10) === iso)) setTodayStatus('exists')
      })
      .catch(() => {})
  }, [])

  async function recordToday() {
    if (todayStatus === 'loading' || todayStatus === 'created' || todayStatus === 'exists') return
    try {
      setTodayStatus('loading')
      const res = await fetch('/api/entries/today', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'failed')
      setTodayStatus(json.status)
    } catch {
      setTodayStatus('idle')
    }
  }

  const base = month ?? today.slice(0, 7) + '-01'
  const start = startOfMonthJst(base)
  const end = endOfMonthJst(base)
  const days: Date[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  const todayIso = toISODate(today)
  const leading = new Date(start).getDay() // 0=Sun

  return (
    <div className="space-y-2" aria-label="今月のカレンダー">
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-600">
        {['日', '月', '火', '水', '木', '金', '土'].map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: leading }).map((_, i) => (
          <div key={`lead-${i}`} className="aspect-square" aria-hidden />
        ))}
        {days.map((d) => {
          const iso = toISODate(d)
          const isToday = iso === todayIso
          const isMarked = marked?.has(iso)
          return (
            <button
              key={iso}
              onClick={isToday ? recordToday : undefined}
              className={`aspect-square rounded-lg text-sm flex items-center justify-center border transition ${
                isToday
                  ? `border-blue-300 ${todayStatus === 'exists' || todayStatus === 'created' ? 'bg-blue-100' : 'bg-blue-200 hover:bg-green-500 text-white'} text-blue-900`
                  : 'border-gray-200 bg-white'
              } ${!isToday ? 'opacity-90 cursor-default' : 'cursor-pointer'}`}
              disabled={!isToday || todayStatus === 'loading' || todayStatus === 'created' || todayStatus === 'exists'}
              aria-disabled={!isToday}
              aria-label={`${iso}${isToday ? ' 今日' : ''}`}
              title={iso}
            >
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xl">{new Date(iso).getDate()}</span>
                {isToday && (todayStatus === 'exists' || todayStatus === 'created') ? (
                  <span className="mt-0.5 text-lg font-semibold text-blue-900">済</span>
                ) : isToday && todayStatus === 'loading' ? (
                  <span className="mt-0.5 text-lg font-semibold text-blue-900">…</span>
                ) : isMarked ? (
                  <span className="mt-0.5 text-lg font-semibold text-blue-900">済</span>
                ) : (
                  <span className="mt-0.5 text-lg opacity-0">.</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

