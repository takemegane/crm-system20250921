import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // ビルド時の実行を防ぐ
    if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
      return NextResponse.json({ error: 'Database not available during build' }, { status: 503 })
    }

    const session = await getServerSession(authOptions).catch(() => null)

    if (!session || !hasPermission(session.user?.role as UserRole, 'VIEW_ADMINS')) {
      return NextResponse.json({ error: 'Unauthorized - Admin management access required' }, { status: 403 })
    }

    const admins = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    }).catch((error) => {
      console.error('Database connection error (admins list):', error);
      return [];
    });

    return NextResponse.json(admins)
  } catch (error) {
    console.error('Error fetching admins:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !hasPermission(session.user.role as UserRole, 'CREATE_ADMINS')) {
      return NextResponse.json({ error: 'Unauthorized - Admin creation access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    }).catch((error) => {
      console.error('Database connection error (existing user check):', error);
      return null;
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'OPERATOR'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    }).catch((error) => {
      console.error('Database connection error (admin creation):', error);
      throw error;
    });

    return NextResponse.json(admin, { status: 201 })
  } catch (error) {
    console.error('Error creating admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}