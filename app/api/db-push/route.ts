import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 DB Push API called')
    
    const session = await getServerSession(authOptions)
    
    // オーナー権限のみ実行可能
    if (!session || session.user?.role !== 'OWNER') {
      console.log('❌ Permission denied - OWNER access required')
      return NextResponse.json({ error: 'OWNER access required' }, { status: 403 })
    }
    
    console.log('✅ OWNER permission confirmed')

    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'DATABASE_URL not available' }, { status: 503 })
    }

    console.log('🔄 Executing prisma db push...')
    
    try {
      // Prismaクライアント生成
      console.log('📦 Generating Prisma client...')
      const generateResult = await execAsync('npx prisma generate')
      console.log('✅ Prisma client generated:', generateResult.stdout)
      
      // データベーススキーマプッシュ
      console.log('🔄 Pushing database schema...')
      const pushResult = await execAsync('npx prisma db push --accept-data-loss')
      console.log('✅ Database schema pushed:', pushResult.stdout)
      
      return NextResponse.json({
        success: true,
        message: 'Database schema synchronized successfully',
        timestamp: new Date().toISOString(),
        generateOutput: generateResult.stdout,
        pushOutput: pushResult.stdout
      })

    } catch (execError: any) {
      console.error('❌ Prisma execution error:', execError)
      return NextResponse.json({
        error: 'Database synchronization failed',
        details: execError.message || String(execError),
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ DB Push API Error:', error)
    return NextResponse.json(
      { 
        error: 'Database push failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}