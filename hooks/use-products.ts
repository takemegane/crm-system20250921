import { useQuery } from '@tanstack/react-query'

type Product = {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  categoryId?: string
  sortOrder: number
  category?: {
    id: string
    name: string
  }
  isActive: boolean
}

type ProductsResponse = {
  products: Product[]
  total: number
  hasMore: boolean
}

async function fetchProducts({ search, category }: { search?: string, category?: string }): Promise<ProductsResponse> {
  const params = new URLSearchParams({
    ...(search && { search }),
    ...(category && { category })
  })

  const response = await fetch(`/api/products?${params}`)
  
  if (!response.ok) {
    throw new Error('商品の取得に失敗しました')
  }

  return response.json()
}

export function useProducts({ search, category }: { search?: string, category?: string } = {}) {
  return useQuery({
    queryKey: ['products', { search, category }],
    queryFn: () => fetchProducts({ search, category }),
    staleTime: 5 * 60 * 1000, // 5分
    gcTime: 10 * 60 * 1000, // 10分
  })
}