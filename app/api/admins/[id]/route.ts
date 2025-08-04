import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { hasPermission, UserRole } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ビルド時のエラーを防ぐため、セッション確認を先に実行
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 403 })
    }

    // データベース接続のエラーハンドリングを強化
    const admin = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    }).catch((error) => {
      console.error('Database connection error:', error);
      return null;
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    return NextResponse.json(admin)
  } catch (error) {
    console.error('Error fetching admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, role, password } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Check if email already exists (but not for current user)
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: params.id }
      }
    }).catch((error) => {
      console.error('Database connection error (email check):', error);
      return null;
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      )
    }

    const updateData: any = {
      name,
      email,
      role: role || 'OPERATOR'
    }

    // Only update password if provided
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters long' },
          { status: 400 }
        )
      }
      updateData.password = await bcrypt.hash(password, 12)
    }

    const admin = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    }).catch((error) => {
      console.error('Database connection error (update):', error);
      throw error;
    });

    return NextResponse.json(admin)
  } catch (error) {
    console.error('Error updating admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized - Owner access required' }, { status: 403 })
    }

    // Prevent deleting yourself
    if (session.user.id === params.id) {
      return NextResponse.json(
        { error: '自分自身のアカウントは削除できません' },
        { status: 400 }
      )
    }

    // Check if admin exists
    const admin = await prisma.user.findUnique({
      where: { id: params.id }
    }).catch((error) => {
      console.error('Database connection error (admin check):', error);
      return null;
    });

    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    await prisma.user.delete({
      where: { id: params.id }
    }).catch((error) => {
      console.error('Database connection error (delete):', error);
      throw error;
    });

    return NextResponse.json({ message: 'Admin deleted successfully' })
  } catch (error) {
    console.error('Error deleting admin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}