'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, ApiError } from '@/utils/api-error-handler'

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
      const data = await apiClient<{ customers?: Customer[] } | Customer[]>(url)
      return Array.isArray(data) ? data : data.customers || []
    },
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分,
    retry: (failureCount, error) => {
      // 認証エラーや権限エラーはリトライしない
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return false
      }
      return failureCount < 2
    }
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      return apiClient<Customer>(`/api/customers/${id}`)
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      // 認証エラーや権限エラー、404エラーはリトライしない
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        return false
      }
      return failureCount < 2
    }
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (customerData: any) => {
      return apiClient<Customer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
      })
    },
    onSuccess: () => {
      // 顧客一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      console.error('Failed to create customer:', error)
      // 認証エラーの場合はキャッシュをクリア
      if (error instanceof ApiError && error.status === 401) {
        queryClient.clear()
      }
    }
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...customerData }: { id: string } & any) => {
      return apiClient<Customer>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(customerData),
      })
    },
    onSuccess: (data, variables) => {
      // 特定顧客とリストのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      console.error('Failed to update customer:', error)
      if (error instanceof ApiError && error.status === 401) {
        queryClient.clear()
      }
    }
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient(`/api/customers/${id}`, {
        method: 'DELETE',
      })
    },
    onSuccess: () => {
      // 顧客一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
    onError: (error) => {
      console.error('Failed to delete customer:', error)
      if (error instanceof ApiError && error.status === 401) {
        queryClient.clear()
      }
    }
  })
}