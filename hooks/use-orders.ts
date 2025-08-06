'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type OrderItem = {
  id: string
  productName: string
  price: number
  quantity: number
  subtotal: number
  product: {
    id: string
    name: string
    imageUrl?: string
  }
}

type Order = {
  id: string
  orderNumber: string
  subtotalAmount: number
  shippingFee: number
  totalAmount: number
  status: string
  shippingAddress: string | null
  recipientName: string | null
  contactPhone: string | null
  notes: string | null
  orderedAt: string
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancelReason?: string | null
  customer: {
    id: string
    name: string
    email: string
  }
  orderItems: OrderItem[]
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders')
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }
      const data = await response.json()
      return data.orders || data
    },
    staleTime: 2 * 60 * 1000, // 2分（注文は頻繁に更新される可能性があるため短め）
    gcTime: 5 * 60 * 1000, // 5分
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch order')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        throw new Error('Failed to update order status')
      }
      return response.json()
    },
    onSuccess: (data, variables) => {
      // 特定注文とリストのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['order', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'cancel' }),
      })
      if (!response.ok) {
        throw new Error('Failed to cancel order')
      }
      return response.json()
    },
    onSuccess: (data, id) => {
      // 特定注文とリストのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}