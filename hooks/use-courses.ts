'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Course = {
  id: string
  name: string
  description?: string
  price: number
  duration?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    enrollments: number
  }
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const response = await fetch('/api/courses')
      if (!response.ok) {
        throw new Error('Failed to fetch courses')
      }
      const data = await response.json()
      return data.courses || data
    },
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
  })
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const response = await fetch(`/api/courses/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch course')
      }
      return response.json()
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (courseData: {
      name: string
      description?: string
      price: number
      duration?: string
      isActive?: boolean
    }) => {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      })
      if (!response.ok) {
        throw new Error('Failed to create course')
      }
      return response.json()
    },
    onSuccess: () => {
      // コース一覧のキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}

export function useUpdateCourse() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...courseData }: { id: string } & {
      name: string
      description?: string
      price: number
      duration?: string
      isActive?: boolean
    }) => {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      })
      if (!response.ok) {
        throw new Error('Failed to update course')
      }
      return response.json()
    },
    onSuccess: (data, variables) => {
      // 特定コースとリストのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['course', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      // 顧客データにもコース情報が含まれるため無効化
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

export function useDeleteCourse() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/courses/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete course')
      }
      return response.json()
    },
    onSuccess: () => {
      // コース一覧と顧客データのキャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['courses'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}