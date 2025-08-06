import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

type Customer = {
  id: string
  name: string
  nameKana?: string
  email: string
  phone?: string
  address?: string
  birthDate?: string
  gender?: string
  joinedAt: string
}

async function fetchCustomerProfile(): Promise<Customer> {
  const response = await fetch('/api/customer-profile')
  if (!response.ok) {
    throw new Error('プロフィールの取得に失敗しました')
  }
  return response.json()
}

export function useCustomerProfile() {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['customerProfile'],
    queryFn: fetchCustomerProfile,
    // 顧客でログイン済みの場合のみクエリを実行
    enabled: !!session && session.user?.userType === 'customer',
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
  })
}