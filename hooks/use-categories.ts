import { useQuery } from '@tanstack/react-query'

type Category = {
  id: string
  name: string
}

type CategoriesResponse = {
  categories: Category[]
}

async function fetchCategories(): Promise<CategoriesResponse> {
  const response = await fetch('/api/categories')
  if (!response.ok) {
    throw new Error('カテゴリの取得に失敗しました')
  }
  return response.json()
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10分
    gcTime: 30 * 60 * 1000, // 30分
  })
}