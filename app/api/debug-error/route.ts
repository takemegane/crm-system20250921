import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug API called')
    
    // 1. Prismaクライアントの確認
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ 
        error: 'Prisma client initialization failed',
        step: 1
      }, { status: 503 })
    }
    console.log('✅ Prisma client initialized')

    // 2. データベース接続テスト
    try {
      const testQuery = await prisma.$queryRaw`SELECT 1 as test`
      console.log('✅ Database connection successful')
    } catch (dbError) {
      return NextResponse.json({
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : String(dbError),
        step: 2
      }, { status: 500 })
    }

    // 3. Courseテーブルの確認
    try {
      const courseCount = await prisma.course.count()
      console.log(`✅ Course table accessible, count: ${courseCount}`)
    } catch (courseError) {
      return NextResponse.json({
        error: 'Course table error',
        details: courseError instanceof Error ? courseError.message : String(courseError),
        step: 3
      }, { status: 500 })
    }

    // 4. Customerテーブルの確認
    try {
      const customerCount = await prisma.customer.count()
      console.log(`✅ Customer table accessible, count: ${customerCount}`)
    } catch (customerError) {
      return NextResponse.json({
        error: 'Customer table error',
        details: customerError instanceof Error ? customerError.message : String(customerError),
        step: 4
      }, { status: 500 })
    }

    // 5. セッション確認
    const session = await getServerSession(authOptions)
    const sessionInfo = session ? {
      hasSession: true,
      userEmail: session.user?.email,
      userRole: session.user?.role,
      userType: session.user?.userType
    } : {
      hasSession: false
    }

    // 6. 全テーブルの確認
    const tables = {
      customers: await prisma.customer.count(),
      courses: await prisma.course.count(),
      products: await prisma.product.count(),
      categories: await prisma.category.count(),
      orders: await prisma.order.count()
    }

    return NextResponse.json({
      success: true,
      message: 'All systems operational',
      session: sessionInfo,
      tables: tables,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Debug API error:', error)
    return NextResponse.json({
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}