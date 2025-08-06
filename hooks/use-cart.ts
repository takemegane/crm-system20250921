import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { apiClient, ApiError } from '@/utils/api-error-handler'

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
  return apiClient<Cart>('/api/cart')
}

async function updateCartItem({ itemId, quantity }: { itemId: string, quantity: number }) {
  return apiClient(`/api/cart/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity })
  })
}

async function addToCart({ productId, quantity }: { productId: string, quantity: number }) {
  return apiClient('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity })
  })
}

async function removeCartItem(itemId: string) {
  return apiClient(`/api/cart/${itemId}`, {
    method: 'DELETE'
  })
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
    // initialDataを削除し、ローディング状態を適切に処理
    retry: (failureCount, error) => {
      // 認証エラーや権限エラーはリトライしない
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        return false
      }
      return failureCount < 2
    }
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: updateCartItem,
    onSuccess: () => {
      // カートを再取得
      queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
    onError: (error) => {
      console.error('Failed to update cart item:', error)
      if (error instanceof ApiError && error.status === 401) {
        queryClient.clear()
      }
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
    },
    onError: (error) => {
      console.error('Failed to add to cart:', error)
      if (error instanceof ApiError && error.status === 401) {
        queryClient.clear()
      }
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
    },
    onError: (error) => {
      console.error('Failed to remove cart item:', error)
      if (error instanceof ApiError && error.status === 401) {
        queryClient.clear()
      }
    }
  })
}