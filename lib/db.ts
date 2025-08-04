import { PrismaClient } from '@prisma/client'

// Vercel サーバーレス環境用のPrismaクライアント管理
let prismaInstance: PrismaClient | null = null

// 遅延初期化関数
function getPrismaClient(): PrismaClient | null {
  // クライアントサイドでは何もしない
  if (typeof window !== 'undefined') {
    return null
  }

  // 既存のインスタンスがあれば返す
  if (prismaInstance) {
    return prismaInstance
  }

  try {
    const databaseUrl = process.env.DATABASE_URL
    console.log('=== Prisma Lazy Initialization ===')
    console.log('DATABASE_URL exists:', !!databaseUrl)
    console.log('Environment:', process.env.NODE_ENV)
    
    if (!databaseUrl) {
      console.error('DATABASE_URL not found')
      return null
    }

    console.log('Creating new Prisma client instance...')
    
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    })

    console.log('✅ Prisma client created successfully')
    return prismaInstance
  } catch (error) {
    console.error('❌ Failed to create Prisma client:', error)
    return null
  }
}

// エクスポートは関数として提供
export const prisma = getPrismaClient()

// ヘルスチェック用の初期化確認関数
export function isPrismaInitialized(): boolean {
  return prisma !== null
}