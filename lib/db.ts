import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ビルド時安全なPrismaクライアント初期化
function createPrismaClient() {
  try {
    // クライアントサイドでは何もしない
    if (typeof window !== 'undefined') {
      console.warn('Prisma client cannot be initialized on client side')
      return null
    }
    
    const databaseUrl = process.env.DATABASE_URL
    console.log('=== Prisma Client Initialization ===')
    console.log('DATABASE_URL exists:', !!databaseUrl)
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('typeof window:', typeof window)
    
    if (!databaseUrl) {
      console.error('DATABASE_URL not found, cannot initialize Prisma client')
      return null
    }

    console.log('Creating Prisma client with URL:', databaseUrl.substring(0, 50) + '...')
    
    const client = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      // Vercel Edge Runtime 対応設定
      __internal: {
        engine: {
          binaryPath: undefined,
          allowTriggerPanic: false,
        },
      }
    })

    console.log('✅ Prisma client created successfully')
    return client
  } catch (error) {
    console.error('❌ Failed to create Prisma client:', error)
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    return null
  }
}

// Prismaクライアントの初期化とキャッシュ
console.log('=== Prisma Export Initialization ===')
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (prisma) {
  globalForPrisma.prisma = prisma
  console.log('✅ Prisma client exported and cached globally')
  console.log('Prisma client type:', typeof prisma)
} else {
  console.error('❌ Prisma client is null - initialization failed')
  console.log('globalForPrisma.prisma:', globalForPrisma.prisma)
}