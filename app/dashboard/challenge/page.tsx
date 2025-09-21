"use client"
import { useState } from 'react'
import { CalendarView } from '@/components/month-challenge/CalendarView'

export default function AdminChallengePage() {
  const [customerId, setCustomerId] = useState<string>('')
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Month Challenge（顧客閲覧）</h1>
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">顧客IDを指定</label>
        <input
          className="input-modern border rounded-md px-3 py-2 w-full"
          placeholder="顧客IDを入力してください"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        />
        <p className="text-xs text-gray-500">顧客のカレンダーを閲覧します。管理者は記録できません。</p>
      </div>
      {customerId ? (
        <CalendarView customerId={customerId} />
      ) : (
        <p className="text-gray-600">顧客IDを入力すると、その顧客の記録を表示します。</p>
      )}
    </div>
  )
}

