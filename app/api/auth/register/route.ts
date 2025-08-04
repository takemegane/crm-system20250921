import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'
import bcrypt from 'bcryptjs'

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

    const body = await request.json()
    const { 
      name, 
      nameKana, 
      email, 
      phone, 
      address, 
      birthDate, 
      gender, 
      password 
    } = body
    
    // バリデーション
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: '氏名、メールアドレス、パスワードは必須です' },
        { status: 400 }
      )
    }

    // 追加の必須項目チェック
    if (!nameKana || !phone || !address || !birthDate || !gender) {
      return NextResponse.json(
        { error: 'フリガナ、電話番号、住所、生年月日、性別は必須です' },
        { status: 400 }
      )
    }
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'データベースに接続できません' },
        { status: 503 }
      )
    }

    // メールアドレスの重複確認（管理者ユーザーとも重複チェック）
    const [existingCustomer, existingUser] = await Promise.all([
      prisma.customer.findUnique({
        where: { email }
      }).catch(() => null),
      prisma.user.findUnique({
        where: { email }
      }).catch(() => null)
    ])
    
    if (existingCustomer || existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      )
    }
    
    // パスワードのハッシュ化
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // 顧客アカウント作成
    const customer = await prisma.customer.create({
      data: {
        name,
        nameKana,
        email,
        phone,
        address,
        birthDate: birthDate ? new Date(birthDate) : null,
        gender,
        password: hashedPassword,
        isECUser: true // ECサイトユーザーフラグ
      }
    }).catch((error) => {
      console.error('Database creation error:', error)
      throw new Error('データベースへの保存に失敗しました')
    })
    
    // パスワードを除外してレスポンス
    const { password: _, ...customerWithoutPassword } = customer
    
    return NextResponse.json(
      { 
        message: 'アカウントが作成されました',
        customer: customerWithoutPassword
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating customer account:', error)
    return NextResponse.json(
      { error: 'アカウントの作成に失敗しました' },
      { status: 500 }
    )
  }
}