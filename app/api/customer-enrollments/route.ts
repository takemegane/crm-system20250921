import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    // 顧客認証チェック
    if (!session || session.user.userType !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 顧客のコース申し込み情報を取得
    const enrollments = await prisma.enrollment.findMany({
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