import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ビルド時安全なPrismaクライアント初期化
function createPrismaClient() {
  try {
    // ビルド時やDATABASE_URLが無い場合の処理
    if (typeof window !== 'undefined') {
      // クライアントサイドでは何もしない
      return null
    }
    
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not found, skipping Prisma client initialization')
      return null
    }

    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
    })
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    return null
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma
}