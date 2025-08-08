import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('⚙️ System settings API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    // システム設定の取得は認証不要（公開情報として使用）
    console.log('🔍 Fetching system settings...')
    let settings = await prisma.systemSettings.findFirst({
      where: {
        isActive: true
      }
    })
    console.log('✅ Settings query completed:', !!settings)

    // 設定が存在しない場合はデフォルト値を作成
    if (!settings) {
      console.log('🔧 Creating default system settings...')
      settings = await prisma.systemSettings.create({
        data: {
          systemName: "CRM管理システム",
          primaryColor: "#3B82F6",
          secondaryColor: "#1F2937",
          backgroundColor: "#F8FAFC",
          isActive: true
        }
      })
      console.log('✅ Default settings created:', settings.id)
    }

    console.log('✅ Returning system settings')
    return NextResponse.json(settings)
  } catch (error) {
    console.error('❌ Error fetching system settings:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('⚙️ System settings PUT API called')
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    const session = await getServerSession(authOptions)
    console.log('👤 Session user:', session?.user?.email || 'No session')

    // オーナーのみがシステム設定を変更可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 403 })
    }

    const body = await request.json()
    console.log('📝 Request body received:', JSON.stringify(body, null, 2))
    
    const { systemName, logoUrl, faviconUrl, primaryColor, secondaryColor, backgroundColor, description, communityLinkText, communityLinkUrl, shippingFee, freeShippingThreshold, dashboardWidgets, menuLinks } = body
    
    console.log('🔍 Extracted fields:')
    console.log('  - systemName:', systemName)
    console.log('  - logoUrl:', logoUrl)
    console.log('  - faviconUrl:', faviconUrl)
    console.log('  - primaryColor:', primaryColor)
    console.log('  - secondaryColor:', secondaryColor)
    console.log('  - backgroundColor:', backgroundColor)
    console.log('  - dashboardWidgets:', dashboardWidgets ? 'present' : 'null')
    console.log('  - menuLinks:', menuLinks ? 'present' : 'null')

    // 現在のアクティブな設定を取得または作成
    console.log('🔍 Finding current active settings...')
    let existingSettings = await prisma.systemSettings.findFirst({
      where: {
        isActive: true
      }
    })
    console.log('🔍 Existing settings found:', !!existingSettings)

    const settingsData = {
      systemName: systemName || "CRM管理システム",
      logoUrl,
      faviconUrl,
      primaryColor: primaryColor || "#3B82F6",
      secondaryColor: secondaryColor || "#1F2937",
      backgroundColor: backgroundColor || "#F8FAFC",
      description,
      communityLinkText,
      communityLinkUrl,
      dashboardWidgets: dashboardWidgets || [],
      menuLinks: menuLinks || [],
      isActive: true
    }
    
    console.log('📝 Settings data to save:', JSON.stringify(settingsData, null, 2))
    
    let settings
    if (existingSettings) {
      // 既存の設定を更新
      console.log('🔄 Updating existing settings...')
      settings = await prisma.systemSettings.update({
        where: { id: existingSettings.id },
        data: settingsData
      })
      console.log('✅ Settings updated with ID:', settings.id)
    } else {
      // 新しい設定を作成
      console.log('🔄 Creating new settings...')
      settings = await prisma.systemSettings.create({
        data: settingsData
      })
      console.log('✅ New settings created with ID:', settings.id)
    }

    console.log('✅ System settings updated successfully:', settings.id)
    return NextResponse.json(settings)
  } catch (error) {
    console.error('❌ Error updating system settings:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}