import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PAYMENT_SETTINGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current payment settings (only one record should exist)
    let settings = await prisma.paymentSettings.findFirst({
      select: {
        id: true,
        stripePublicKey: true,
        isTestMode: true,
        isActive: true,
        currency: true,
        createdAt: true,
        updatedAt: true
        // Don't return stripeSecretKey or stripeWebhookSecret for security
      }
    })

    // If no settings exist, create default
    if (!settings) {
      settings = await prisma.paymentSettings.create({
        data: {
          isTestMode: true,
          isActive: false,
          currency: 'jpy'
        },
        select: {
          id: true,
          stripePublicKey: true,
          isTestMode: true,
          isActive: true,
          currency: true,
          createdAt: true,
          updatedAt: true
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'MANAGE_PAYMENT_SETTINGS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stripePublicKey, stripeSecretKey, stripeWebhookSecret, isTestMode, isActive, currency } = body

    if (!stripePublicKey && isActive) {
      return NextResponse.json(
        { error: 'Stripe Public Key is required when payment is active' },
        { status: 400 }
      )
    }

    // Get or create settings
    const existingSettings = await prisma.paymentSettings.findFirst()

    const updateData: any = {
      stripePublicKey: stripePublicKey || null,
      isTestMode: Boolean(isTestMode),
      isActive: Boolean(isActive),
      currency: currency || 'jpy'
    }

    // Only update secrets if provided
    if (stripeSecretKey) {
      // TODO: In production, encrypt this before storing
      updateData.stripeSecretKey = stripeSecretKey
    }

    if (stripeWebhookSecret) {
      // TODO: In production, encrypt this before storing
      updateData.stripeWebhookSecret = stripeWebhookSecret
    }

    let responseSettings
    if (existingSettings) {
      // Update existing settings
      responseSettings = await prisma.paymentSettings.update({
        where: { id: existingSettings.id },
        data: updateData,
        select: {
          id: true,
          stripePublicKey: true,
          isTestMode: true,
          isActive: true,
          currency: true,
          createdAt: true,
          updatedAt: true
        }
      })
    } else {
      // Create new settings
      responseSettings = await prisma.paymentSettings.create({
        data: updateData,
        select: {
          id: true,
          stripePublicKey: true,
          isTestMode: true,
          isActive: true,
          currency: true,
          createdAt: true,
          updatedAt: true
        }
      })
    }

    return NextResponse.json(responseSettings)
  } catch (error) {
    console.error('Error updating payment settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}