import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

    // Vercel環境チェック
    console.log('🌐 Environment:', process.env.VERCEL ? 'Vercel' : 'Local')
    console.log('📂 Process CWD:', process.cwd())

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    console.log('✅ File buffer created, size:', buffer.length)

    // アップロードディレクトリの作成
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    console.log('📁 Upload directory path:', uploadDir)
    
    if (!existsSync(uploadDir)) {
      console.log('📁 Creating upload directory...')
      await mkdir(uploadDir, { recursive: true })
      console.log('✅ Upload directory created')
    } else {
      console.log('✅ Upload directory already exists')
    }

    // ファイル名の生成（重複を避けるためタイムスタンプを使用）
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${timestamp}.${fileExtension}`
    const filePath = join(uploadDir, fileName)
    console.log('📝 Generated file path:', filePath)

    // ファイルを保存
    console.log('💾 Writing file to disk...')
    await writeFile(filePath, buffer)
    console.log('✅ File written successfully')

    // アクセス可能なURLを返す
    const fileUrl = `/uploads/${fileName}`
    console.log('🔗 Generated file URL:', fileUrl)

    console.log('🎉 Upload completed successfully')
    return NextResponse.json({ 
      success: true, 
      url: fileUrl,
      fileName: fileName
    })
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