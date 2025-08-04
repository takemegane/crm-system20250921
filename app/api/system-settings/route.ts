import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET() {
  try {
    // システム設定の取得は認証不要（公開情報として使用）
    let settings = await prisma.systemSettings.findFirst({
      where: {
        isActive: true
      }
    })

    // 設定が存在しない場合はデフォルト値を作成
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          systemName: "CRM管理システム",
          primaryColor: "#3B82F6",
          secondaryColor: "#1F2937",
          backgroundColor: "#F8FAFC",
          isActive: true
        }
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // オーナーのみがシステム設定を変更可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 403 })
    }

    const body = await request.json()
    const { systemName, logoUrl, faviconUrl, primaryColor, secondaryColor, backgroundColor, description, communityLinkText, communityLinkUrl, shippingFee, freeShippingThreshold } = body

    // 現在のアクティブな設定を無効化
    await prisma.systemSettings.updateMany({
      where: {
        isActive: true
      },
      data: {
        isActive: false
      }
    })

    // 新しい設定を作成
    const settings = await prisma.systemSettings.create({
      data: {
        systemName: systemName || "CRM管理システム",
        logoUrl,
        faviconUrl,
        primaryColor: primaryColor || "#3B82F6",
        secondaryColor: secondaryColor || "#1F2937",
        backgroundColor: backgroundColor || "#F8FAFC",
        description,
        communityLinkText,
        communityLinkUrl,
        isActive: true
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating system settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}