import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    // Prismaクライアントの存在確認
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }


    const session = await getServerSession(authOptions)
    
    // 顧客のみプロフィール閲覧可能
    if (!session || session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Customer access required' }, { status: 403 })
    }
    
    const customer = await prisma!.customer.findUnique({
      where: {
        id: session.user.id
      },
      select: {
        id: true,
        name: true,
        nameKana: true,
        email: true,
        phone: true,
        address: true,
        birthDate: true,
        gender: true,
        joinedAt: true
      }
    })
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Error fetching profile:', error)
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

    // Prismaクライアントの存在確認
    if (!prisma) {
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }


    const session = await getServerSession(authOptions)
    
    // 顧客のみプロフィール更新可能
    if (!session || session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Customer access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { name, nameKana, email, phone, address, currentPassword, newPassword } = body

    // 必須フィールドチェック
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // 現在の顧客情報を取得
    const currentCustomer = await prisma!.customer.findUnique({
      where: { id: session.user.id }
    })

    if (!currentCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // パスワード変更がある場合の検証
    let hashedPassword = undefined
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        )
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters' },
          { status: 400 }
        )
      }

      // 現在のパスワード確認
      if (!currentCustomer.password) {
        return NextResponse.json(
          { error: 'Customer password is not set' },
          { status: 400 }
        )
      }
      const isValidPassword = await bcrypt.compare(currentPassword, currentCustomer.password)
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 400 }
        )
      }

      // 新しいパスワードのハッシュ化
      hashedPassword = await bcrypt.hash(newPassword, 12)
    }

    // メールアドレスの重複チェック（他の顧客との重複）
    if (email !== currentCustomer.email) {
      const existingCustomer = await prisma!.customer.findFirst({
        where: {
          email,
          id: { not: session.user.id }
        }
      })

      if (existingCustomer) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    try {
      const updatedCustomer = await prisma!.customer.update({
        where: {
          id: session.user.id
        },
        data: {
          name,
          nameKana: nameKana || null,
          email,
          phone: phone || null,
          address: address || null,
          ...(hashedPassword && { password: hashedPassword })
        },
        select: {
          id: true,
          name: true,
          nameKana: true,
          email: true,
          phone: true,
          address: true,
          birthDate: true,
          gender: true,
          joinedAt: true
        }
      })

      return NextResponse.json(updatedCustomer)
    } catch (error: any) {
      console.error('Database error:', error)
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
      throw error
    }
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}