import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🎓 Course customer details API called for courseId:', params.id)
    
    // データベース接続確認
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not available')
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Prismaクライアントの動的初期化
    const prisma = getPrismaClient()
    if (!prisma) {
      console.log('❌ Prisma client not initialized')
      return NextResponse.json({ error: 'Prisma client not initialized' }, { status: 503 })
    }

    console.log('✅ Prisma client ready')

    // 認証チェック
    const session = await getServerSession(authOptions)
    console.log('👤 Session info:', {
      hasSession: !!session,
      email: session?.user?.email,
      userType: session?.user?.userType,
      role: session?.user?.role,
      id: session?.user?.id
    })
    
    if (!session) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized - no session' }, { status: 403 })
    }
    
    // 顧客チェック（roleがCUSTOMERまたはuserTypeがcustomerの場合を許可）
    const isCustomer = session.user?.userType === 'customer' || session.user?.role === 'CUSTOMER'
    
    if (!isCustomer) {
      console.log('❌ Permission denied - not a customer. userType:', session.user?.userType, 'role:', session.user?.role)
      return NextResponse.json({ error: 'Unauthorized - not a customer' }, { status: 403 })
    }

    console.log('✅ Customer authentication passed')

    // コース情報を取得
    const course = await prisma.course.findUnique({
      where: { 
        id: params.id,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        duration: true,
        isActive: true,
        communityLinkText: true,
        communityLinkUrl: true
      }
    })

    if (!course) {
      console.log('❌ Course not found or inactive:', params.id)
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    console.log('✅ Course found:', course.name)

    // 顧客のコース登録状況を確認
    const customerId = session.user?.id
    if (!customerId) {
      console.log('❌ No customer ID in session')
      return NextResponse.json({ error: 'Customer ID not found' }, { status: 403 })
    }
    
    console.log('🔍 Checking enrollment for customerId:', customerId, 'courseId:', params.id)
    
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        customerId: customerId,
        courseId: params.id
      },
      select: {
        id: true,
        status: true,
        enrolledAt: true
      }
    })

    console.log('🔍 Enrollment status:', enrollment ? 'Enrolled' : 'Not enrolled')

    // レスポンス組み立て
    const courseDetails = {
      ...course,
      enrollment: enrollment ? {
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt.toISOString()
      } : null
    }

    console.log('✅ Course details prepared successfully')
    return NextResponse.json(courseDetails)

  } catch (error) {
    console.error('❌ Error getting course customer details:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}