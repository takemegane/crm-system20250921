import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'データベースに接続できません' },
        { status: 503 }
      )
    }

    // 既存の管理者をチェック
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'OWNER' }
    }).catch(() => null)

    if (existingAdmin) {
      return NextResponse.json(
        { error: '管理者アカウントは既に存在します' },
        { status: 400 }
      )
    }

    // デフォルト管理者アカウントを作成
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const admin = await prisma.user.create({
      data: {
        id: 'admin001',
        email: 'admin@example.com',
        name: 'システム管理者',
        password: hashedPassword,
        role: 'OWNER'
      }
    }).catch((error) => {
      console.error('Database creation error:', error)
      throw new Error('データベースへの保存に失敗しました')
    })

    return NextResponse.json(
      { 
        message: '管理者アカウントが作成されました',
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating admin account:', error)
    return NextResponse.json(
      { error: 'アカウントの作成に失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}