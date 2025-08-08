import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v2 as cloudinary } from 'cloudinary'

// Cloudinary設定
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Upload API called')
    
    const session = await getServerSession(authOptions)
    console.log('👤 Session user:', session?.user?.email || 'No session', 'role:', session?.user?.role)

    // オーナー、管理者、運営者がファイルアップロード可能（商品管理のため）
    if (!session || !['OWNER', 'ADMIN', 'OPERATOR'].includes(session.user.role)) {
      console.log('❌ Permission denied for user:', session?.user?.email, 'role:', session?.user?.role)
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    console.log('✅ Permission check passed')

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    console.log('📁 File info:', file ? `name: ${file.name}, size: ${file.size}, type: ${file.type}` : 'No file')

    if (!file) {
      console.log('❌ No file in request')
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // ファイルタイプの検証
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ Invalid file type:', file.type)
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 })
    }

    // ファイルサイズの検証 (5MB以下)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ File too large:', file.size)
      return NextResponse.json({ error: 'File size too large. Maximum 5MB allowed.' }, { status: 400 })
    }

    console.log('✅ File validation passed')

    // Cloudinary環境変数チェック
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET
    
    console.log('🔍 Cloudinary environment check:')
    console.log('  - CLOUD_NAME:', cloudName ? `✅ Set (${cloudName.substring(0, 5)}...)` : '❌ Missing')
    console.log('  - API_KEY:', apiKey ? `✅ Set (${apiKey.substring(0, 5)}...)` : '❌ Missing')
    console.log('  - API_SECRET:', apiSecret ? '✅ Set' : '❌ Missing')
    
    if (!cloudName || !apiKey || !apiSecret) {
      console.log('❌ Cloudinary environment variables not configured')
      return NextResponse.json({ 
        error: 'Image upload service not configured',
        missing_vars: {
          CLOUDINARY_CLOUD_NAME: !cloudName,
          CLOUDINARY_API_KEY: !apiKey,
          CLOUDINARY_API_SECRET: !apiSecret
        }
      }, { status: 500 })
    }

    // 追加：環境変数の値をマスクして表示（デバッグ用）
    console.log('🔍 Environment variables masked values:')
    console.log('  - CLOUD_NAME length:', cloudName.length)
    console.log('  - API_KEY length:', apiKey.length)
    console.log('  - API_SECRET length:', apiSecret.length)

    console.log('✅ Cloudinary configuration found')
    
    // Cloudinaryクライアント再設定（デバッグ用）
    console.log('🔧 Reconfiguring Cloudinary client...')
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    })
    console.log('✅ Cloudinary client reconfigured')

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log('✅ File buffer created, size:', buffer.length)

    // ファイル名をCloudinary対応形式にサニタイズ
    const sanitizeFileName = (filename: string): string => {
      return filename
        .split('.')[0] // 拡張子を除去
        .replace(/[^a-zA-Z0-9_-]/g, '_') // 英数字、_、-以外を_に置換
        .replace(/_{2,}/g, '_') // 連続する_を単一の_に
        .replace(/^_+|_+$/g, '') // 先頭・末尾の_を除去
        .substring(0, 50) // 最大50文字に制限
    }
    
    const sanitizedFileName = sanitizeFileName(file.name)
    const publicId = `${Date.now()}-${sanitizedFileName}`
    
    console.log('📝 Original filename:', file.name)
    console.log('📝 Sanitized filename:', sanitizedFileName)
    console.log('📝 Generated public_id:', publicId)

    // Cloudinaryにアップロード
    console.log('☁️ Uploading to Cloudinary...')
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: 'crm-system', // Cloudinary内のフォルダ名
            public_id: publicId, // サニタイズされた一意のID
            overwrite: true,
            transformation: [
              { width: 1000, height: 1000, crop: 'limit' }, // 最大サイズ制限
              { quality: 'auto' } // 自動品質最適化
            ]
          },
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error)
              reject(error)
            } else {
              console.log('✅ Cloudinary upload successful:', result?.public_id)
              resolve(result)
            }
          }
        ).end(buffer)
      })

      const result = uploadResult as any
      const fileUrl = result.secure_url
      console.log('🔗 Cloudinary URL:', fileUrl)

      console.log('🎉 Upload completed successfully')
      return NextResponse.json({ 
        success: true, 
        url: fileUrl,
        fileName: result.public_id,
        cloudinaryId: result.public_id
      })
    } catch (cloudinaryError) {
      console.error('❌ Cloudinary upload failed:', cloudinaryError)
      console.error('❌ Cloudinary error type:', typeof cloudinaryError)
      console.error('❌ Cloudinary error JSON:', JSON.stringify(cloudinaryError, null, 2))
      
      // Cloudinaryエラーの詳細解析
      let errorMessage = 'Unknown error'
      let errorDetails = {}
      
      if (cloudinaryError instanceof Error) {
        errorMessage = cloudinaryError.message
        errorDetails = {
          name: cloudinaryError.name,
          message: cloudinaryError.message,
          stack: cloudinaryError.stack
        }
      } else if (typeof cloudinaryError === 'object' && cloudinaryError !== null) {
        // Cloudinary特有のエラーオブジェクト処理
        const errorObj = cloudinaryError as any
        errorMessage = errorObj.message || errorObj.error?.message || 'Cloudinary service error'
        errorDetails = {
          http_code: errorObj.http_code,
          message: errorObj.message,
          error: errorObj.error,
          full_error: cloudinaryError
        }
      } else {
        errorMessage = String(cloudinaryError)
      }
      
      console.error('❌ Processed error message:', errorMessage)
      console.error('❌ Processed error details:', errorDetails)
      
      return NextResponse.json(
        { 
          error: 'Image upload failed',
          message: errorMessage,
          details: errorDetails,
          raw_error: String(cloudinaryError)
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Error uploading file:', error)
    console.error('❌ Error details:', error instanceof Error ? error.message : String(error))
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}