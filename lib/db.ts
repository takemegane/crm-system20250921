import { PrismaClient } from '@prisma/client'

// グローバルキャッシュ
declare global {
  var __prisma: PrismaClient | undefined
}

// API呼び出し時の動的初期化関数
export function getPrismaClient(): PrismaClient | null {
  try {
    const shouldLog = process.env.DEBUG_PRISMA === 'true' || process.env.NODE_ENV !== 'production'
    const log = (...args: any[]) => {
      if (shouldLog) console.log(...args)
    }
    const warn = (...args: any[]) => {
      if (shouldLog) console.warn(...args)
    }
    const error = (...args: any[]) => {
      // エラーは開発時のみ詳細に出す。本番では抑制。
      if (shouldLog) console.error(...args)
    }

    log('🔍 getPrismaClient called')
    log('🔍 typeof window:', typeof window)
    log('🔍 process.env.NODE_ENV:', process.env.NODE_ENV)
    
    // クライアントサイドでは何もしない
    if (typeof window !== 'undefined') {
      log('🔍 Skipping - client side')
      return null
    }

    // 既存のグローバルインスタンスがあれば返す
    if (global.__prisma) {
      log('🔍 Returning cached Prisma client')
      return global.__prisma
    }

    const databaseUrl = process.env.DATABASE_URL
    log('=== Dynamic Prisma Initialization ===')
    log('🔍 DATABASE_URL exists:', !!databaseUrl)
    log('🔍 DATABASE_URL length:', databaseUrl?.length || 0)
    log('🔍 DATABASE_URL preview:', databaseUrl?.substring(0, 30) + '...' || 'undefined')
    log('🔍 Environment:', process.env.NODE_ENV)
    log('🔍 Runtime:', process.env.VERCEL_ENV || 'local')
    
    if (!databaseUrl) {
      error('❌ DATABASE_URL not found in environment')
      warn('🔍 Available env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')))
      return null
    }

    log('🔍 About to create PrismaClient...')
    
    try {
      const client = new PrismaClient({
        log: ['error', 'warn', 'info'],
        datasources: {
          db: {
            url: databaseUrl
          }
        }
      })

      log('🔍 PrismaClient constructor completed')
      
      // グローバルキャッシュに保存
      global.__prisma = client
      
      log('✅ Prisma client created and cached globally')
      return client
    } catch (constructorError) {
      error('❌ PrismaClient constructor failed:', constructorError)
      throw constructorError
    }
  } catch (error) {
    const shouldLog = process.env.DEBUG_PRISMA === 'true' || process.env.NODE_ENV !== 'production'
    if (shouldLog) {
      console.error('❌ Failed to create Prisma client:', error)
      console.error('🔍 Error type:', typeof error)
      console.error('🔍 Error name:', error instanceof Error ? error.name : 'Unknown')
      console.error('🔍 Error message:', error instanceof Error ? error.message : 'Unknown error')
      console.error('🔍 Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    }
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
    const shouldLog = process.env.DEBUG_PRISMA === 'true' || process.env.NODE_ENV !== 'production'
    const log = (...args: any[]) => { if (shouldLog) console.log(...args) }
    log('🔄 Resetting Prisma client cache...')
    
    // 既存のクライアントを切断
    if (global.__prisma) {
      log('🔄 Disconnecting existing client...')
      await global.__prisma.$disconnect()
      log('✅ Existing client disconnected')
    }
    
    // グローバルキャッシュをクリア
    global.__prisma = undefined
    log('✅ Global cache cleared')
    
    // 新しいクライアントを作成
    const newClient = getPrismaClient()
    if (newClient) {
      log('✅ New Prisma client created')
      // 接続テスト
      await newClient.$connect()
      log('✅ New client connected successfully')
    } else {
      log('❌ Failed to create new client')
    }
  } catch (error) {
    const shouldLog = process.env.DEBUG_PRISMA === 'true' || process.env.NODE_ENV !== 'production'
    if (shouldLog) console.error('❌ Error resetting Prisma client:', error)
    throw error
  }
}
