import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
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
    
    // メールアドレスの重複確認（管理者ユーザーとも重複チェック）
    const [existingCustomer, existingUser] = await Promise.all([
      prisma.customer.findUnique({
        where: { email }
      }),
      prisma.user.findUnique({
        where: { email }
      })
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