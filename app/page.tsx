import { redirect } from 'next/navigation'

export default function HomePage() {
  // サーバーサイドで即座にリダイレクト
  redirect('/login')
}