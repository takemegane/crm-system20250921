import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

type CartItem = {
  id: string
  quantity: number
  product: {
    id: string
    name: string
    price: number
    stock: number
    imageUrl?: string
    isActive: boolean
  }
}

type Cart = {
  items: CartItem[]
  total: number
  itemCount: number
}

const emptyCart: Cart = {
  items: [],
  total: 0,
  itemCount: 0
}

async function fetchCart(): Promise<Cart> {
  const response = await fetch('/api/cart')
  if (!response.ok) {
    throw new Error('カートの取得に失敗しました')
  }
  return response.json()
}

async function updateCartItem({ itemId, quantity }: { itemId: string, quantity: number }) {
  const response = await fetch(`/api/cart/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quantity })
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '更新に失敗しました')
  }
  return response.json()
}

async function addToCart({ productId, quantity }: { productId: string, quantity: number }) {
  const response = await fetch('/api/cart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, quantity })
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'カートに追加できませんでした')
  }
  return response.json()
}

async function removeCartItem(itemId: string) {
  const response = await fetch(`/api/cart/${itemId}`, {
    method: 'DELETE'
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '削除に失敗しました')
  }
  return response.json()
}

export function useCart() {
  const { data: session } = useSession()
  
  return useQuery({
    queryKey: ['cart'],
    queryFn: fetchCart,
    // 顧客でログイン済みの場合のみクエリを実行
    enabled: !!session && session.user?.userType === 'customer',
    staleTime: 2 * 60 * 1000, // 2分（カートは頻繁に変更されるため短め）
    gcTime: 5 * 60 * 1000, // 5分
    // エラー時は空のカートを表示
    initialData: emptyCart
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateCartItem,
    onSuccess: () => {
      // カートとシステム設定を再取得
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    }
  })
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: addToCart,
    onSuccess: () => {
      // カートを再取得
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    }
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: removeCartItem,
    onSuccess: () => {
      // カートを再取得
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    }
  })
}