import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // オーナーのみアクセス可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    // 環境変数確認
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    const envCheck = {
      CLOUDINARY_CLOUD_NAME: {
        exists: !!cloudName,
        length: cloudName ? cloudName.length : 0,
        preview: cloudName ? cloudName.substring(0, 5) + '...' : 'missing'
      },
      CLOUDINARY_API_KEY: {
        exists: !!apiKey,
        length: apiKey ? apiKey.length : 0,
        preview: apiKey ? apiKey.substring(0, 5) + '...' : 'missing'
      },
      CLOUDINARY_API_SECRET: {
        exists: !!apiSecret,
        length: apiSecret ? apiSecret.length : 0
      }
    }

    // Cloudinary設定テスト
    let configTest = null
    if (cloudName && apiKey && apiSecret) {
      try {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        })
        
        // 簡単なAPI呼び出しテスト
        const testResult = await cloudinary.api.ping()
        configTest = {
          success: true,
          status: testResult.status
        }
      } catch (error) {
        configTest = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      }
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environmentVariables: envCheck,
      cloudinaryTest: configTest,
      allVariablesPresent: !!(cloudName && apiKey && apiSecret)
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}