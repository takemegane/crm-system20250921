import { CalendarView } from '@/components/month-challenge/CalendarView'

export const dynamic = 'force-dynamic'

export default function MyChallengePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Month Challenge</h1>
      <p className="text-gray-600">「今日を記録」ボタンで、1日1回記録できます。</p>
      <CalendarView />
    </div>
  )
}

