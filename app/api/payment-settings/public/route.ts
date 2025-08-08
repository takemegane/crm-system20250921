import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

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

    // 顧客向け公開情報のみ取得（認証不要）
    const settings = await prisma.paymentSettings.findFirst({
      select: {
        // 支払い方法表示制御
        enableCreditCard: true,
        enableBankTransfer: true,
        enableCashOnDelivery: true,
        
        // 手数料設定（顧客が見るべき情報のみ）
        creditCardFeeType: true,
        creditCardFeeRate: true,
        creditCardFeeFixed: true,
        bankTransferFee: true,
        cashOnDeliveryFee: true,
        
        // 手数料負担者設定
        creditCardFeeBearer: true,
        bankTransferFeeBearer: true,
        cashOnDeliveryFeeBearer: true,
        
        // 基本設定
        isActive: true,
        currency: true
      }
    })

    // デフォルト設定を返す（設定が存在しない場合）
    const defaultSettings = {
      enableCreditCard: false,
      enableBankTransfer: true,
      enableCashOnDelivery: true,
      creditCardFeeType: 'percentage',
      creditCardFeeRate: 3.6,
      creditCardFeeFixed: 0,
      bankTransferFee: 0,
      cashOnDeliveryFee: 330,
      creditCardFeeBearer: 'merchant',
      bankTransferFeeBearer: 'customer',
      cashOnDeliveryFeeBearer: 'customer',
      isActive: false,
      currency: 'jpy'
    }

    return NextResponse.json(settings || defaultSettings)
  } catch (error) {
    console.error('Error fetching public payment settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}