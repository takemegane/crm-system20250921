import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'
import nodemailer from 'nodemailer'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }


    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_EMAIL_SETTINGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get email settings
    const settings = await prisma.emailSettings.findFirst()

    if (!settings || !settings.isActive) {
      return NextResponse.json(
        { error: 'メール送信が無効になっています' },
        { status: 400 }
      )
    }

    if (!settings.smtpUser || !settings.smtpPass) {
      return NextResponse.json(
        { error: 'SMTPユーザー名またはパスワードが設定されていません' },
        { status: 400 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
    })

    // Verify connection
    await transporter.verify()

    return NextResponse.json({ success: true, message: '接続テストに成功しました' })
  } catch (error) {
    console.error('Email connection test error:', error)
    
    let errorMessage = '接続テストに失敗しました'
    if (error instanceof Error) {
      if (error.message.includes('Invalid login')) {
        errorMessage = 'ログイン情報が正しくありません。SMTPユーザー名とアプリパスワードを確認してください。'
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'SMTPサーバーに接続できませんでした。ホストとポート番号を確認してください。'
      } else if (error.message.includes('ETIMEDOUT')) {
        errorMessage = '接続がタイムアウトしました。ネットワーク接続を確認してください。'
      } else {
        errorMessage = `接続エラー: ${error.message}`
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}