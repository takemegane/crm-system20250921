import { PrismaClient } from '@prisma/client'

// グローバルキャッシュ
declare global {
  var __prisma: PrismaClient | undefined
}

// API呼び出し時の動的初期化関数
export function getPrismaClient(): PrismaClient | null {
  try {
    console.log('🔍 getPrismaClient called')
    console.log('🔍 typeof window:', typeof window)
    console.log('🔍 process.env.NODE_ENV:', process.env.NODE_ENV)
    
    // クライアントサイドでは何もしない
    if (typeof window !== 'undefined') {
      console.log('🔍 Skipping - client side')
      return null
    }

    // 既存のグローバルインスタンスがあれば返す
    if (global.__prisma) {
      console.log('🔍 Returning cached Prisma client')
      return global.__prisma
    }

    const databaseUrl = process.env.DATABASE_URL
    console.log('=== Dynamic Prisma Initialization ===')
    console.log('🔍 DATABASE_URL exists:', !!databaseUrl)
    console.log('🔍 DATABASE_URL length:', databaseUrl?.length || 0)
    console.log('🔍 DATABASE_URL preview:', databaseUrl?.substring(0, 30) + '...' || 'undefined')
    console.log('🔍 Environment:', process.env.NODE_ENV)
    console.log('🔍 Runtime:', process.env.VERCEL_ENV || 'local')
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL not found in environment')
      console.log('🔍 Available env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')))
      return null
    }

    console.log('🔍 About to create PrismaClient...')
    
    try {
      const client = new PrismaClient({
        log: ['error', 'warn', 'info'],
        datasources: {
          db: {
            url: databaseUrl
          }
        }
      })

      console.log('🔍 PrismaClient constructor completed')
      
      // グローバルキャッシュに保存
      global.__prisma = client
      
      console.log('✅ Prisma client created and cached globally')
      return client
    } catch (constructorError) {
      console.error('❌ PrismaClient constructor failed:', constructorError)
      throw constructorError
    }
  } catch (error) {
    console.error('❌ Failed to create Prisma client:', error)
    console.error('🔍 Error type:', typeof error)
    console.error('🔍 Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('🔍 Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('🔍 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
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

// Prismaクライアントキャッシュをリセットする関数
export async function resetPrismaClient(): Promise<void> {
  try {
    console.log('🔄 Resetting Prisma client cache...')
    
    // 既存のクライアントを切断
    if (global.__prisma) {
      console.log('🔄 Disconnecting existing client...')
      await global.__prisma.$disconnect()
      console.log('✅ Existing client disconnected')
    }
    
    // グローバルキャッシュをクリア
    global.__prisma = undefined
    console.log('✅ Global cache cleared')
    
    // 新しいクライアントを作成
    const newClient = getPrismaClient()
    if (newClient) {
      console.log('✅ New Prisma client created')
      // 接続テスト
      await newClient.$connect()
      console.log('✅ New client connected successfully')
    } else {
      console.log('❌ Failed to create new client')
    }
  } catch (error) {
    console.error('❌ Error resetting Prisma client:', error)
    throw error
  }
}