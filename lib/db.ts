import { PrismaClient } from '@prisma/client'

// グローバルキャッシュ
declare global {
  var __prisma: PrismaClient | undefined
}

// API呼び出し時の動的初期化関数
export function getPrismaClient(): PrismaClient | null {
  try {
    // クライアントサイドでは何もしない
    if (typeof window !== 'undefined') {
      return null
    }

    // 既存のグローバルインスタンスがあれば返す
    if (global.__prisma) {
      return global.__prisma
    }

    const databaseUrl = process.env.DATABASE_URL
    console.log('=== Dynamic Prisma Initialization ===')
    console.log('DATABASE_URL exists:', !!databaseUrl)
    console.log('Environment:', process.env.NODE_ENV)
    
    if (!databaseUrl) {
      console.error('DATABASE_URL not found')
      return null
    }

    console.log('Creating new Prisma client instance...')
    
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    })

    // グローバルキャッシュに保存
    global.__prisma = client
    
    console.log('✅ Prisma client created and cached globally')
    return client
  } catch (error) {
    console.error('❌ Failed to create Prisma client:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
    return null
  }
}

// 後方互換性のためのエクスポート（nullの可能性あり）
export const prisma = null

// ヘルスチェック用の初期化確認関数
export function isPrismaInitialized(): boolean {
  try {
    const client = getPrismaClient()
    return client !== null
  } catch {
    return false
  }
}