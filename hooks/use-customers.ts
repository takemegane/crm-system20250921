'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Customer = {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  joinedAt: string
  enrollments: Array<{
    id: string
    course: {
      name: string
    }
    enrolledAt: string
    status: string
  }>
  customerTags: Array<{
    id: string
    tag: {
      id: string
      name: string
      color: string
    }
  }>
}

type CustomersParams = {
  tagId?: string
  courseId?: string
}

export function useCustomers(params?: CustomersParams) {
  const queryParams = new URLSearchParams()
  if (params?.tagId) queryParams.append('tagId', params.tagId)
  if (params?.courseId) queryParams.append('courseId', params.courseId)
  const urlParams = queryParams.toString()

  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const url = `/api/customers${urlParams ? `?${urlParams}` : ''}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch customers')
      }
      const data = await response.json()
      return data.customers || data
    },
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const response = await fetch(`/api/customers/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch customer')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (customerData: any) => {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      })
      if (!response.ok) {
        throw new Error('Failed to create customer')
      }
      return response.json()
    },
    onSuccess: () => {
      // 顧客一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...customerData }: { id: string } & any) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      })
      if (!response.ok) {
        throw new Error('Failed to update customer')
      }
      return response.json()
    },
    onSuccess: (data, variables) => {
      // 特定顧客とリストのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete customer')
      }
      return response.json()
    },
    onSuccess: () => {
      // 顧客一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}