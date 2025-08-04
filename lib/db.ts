import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ビルド時のデータベース接続エラーを防ぐためのガード
export const prisma = (() => {
  try {
    // DATABASE_URLが設定されていない場合はダミーのPrismaクライアントを返す
    if (!process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, using mock Prisma client for build')
      return {} as PrismaClient
    }
    
    return globalForPrisma.prisma ?? new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })
  } catch (error) {
    console.error('Failed to initialize Prisma client:', error)
    return {} as PrismaClient
  }
})()

if (process.env.NODE_ENV !== 'production' && typeof prisma === 'object' && 'constructor' in prisma) {
  globalForPrisma.prisma = prisma
}