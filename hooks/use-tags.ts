'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Tag = {
  id: string
  name: string
  color: string
  createdAt: string
  updatedAt: string
  _count?: {
    customerTags: number
  }
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags')
      if (!response.ok) {
        throw new Error('Failed to fetch tags')
      }
      const data = await response.json()
      return data.tags || data
    },
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
  })
}

export function useTag(id: string) {
  return useQuery({
    queryKey: ['tag', id],
    queryFn: async () => {
      const response = await fetch(`/api/tags/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tag')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateTag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (tagData: { name: string; color: string }) => {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tagData),
      })
      if (!response.ok) {
        throw new Error('Failed to create tag')
      }
      return response.json()
    },
    onSuccess: () => {
      // タグ一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
  })
}

export function useUpdateTag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...tagData }: { id: string; name: string; color: string }) => {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tagData),
      })
      if (!response.ok) {
        throw new Error('Failed to update tag')
      }
      return response.json()
    },
    onSuccess: (data, variables) => {
      // 特定タグとリストのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['tag', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      // 顧客データにもタグ情報が含まれるため無効化
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useDeleteTag() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tags/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete tag')
      }
      return response.json()
    },
    onSuccess: () => {
      // タグ一覧と顧客データのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}