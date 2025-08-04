import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
    
    // 顧客認証チェック
    if (!session || session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 顧客のコース申し込み情報を取得
    const enrollments = await prisma!.enrollment.findMany({
      where: {
        customerId: session.user.id
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            isActive: true
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    })

    // アクティブなコースのみをフィルタリング
    const activeEnrollments = enrollments.filter(enrollment => 
      enrollment.course.isActive
    )

    return NextResponse.json({ 
      enrollments: activeEnrollments 
    })
  } catch (error) {
    console.error('Error fetching customer enrollments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}