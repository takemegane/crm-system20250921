import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPrismaClient } from '@/lib/db'

// 商品API問題のデバッグ用エンドポイント
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // オーナー権限のみアクセス可能
    if (!session || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Owner access required' },
        { status: 403 }
      )
    }

    console.log('🔍 Debug Products API called')
    const debugInfo: any = {
      step: 0,
      checks: []
    }

    // Step 1: データベース接続確認
    debugInfo.step = 1
    debugInfo.checks.push('Database URL check')
    if (!process.env.DATABASE_URL) {
      debugInfo.error = 'DATABASE_URL not found'
      return NextResponse.json(debugInfo, { status: 500 })
    }

    // Step 2: Prismaクライアント確認
    debugInfo.step = 2
    debugInfo.checks.push('Prisma client check')
    const prisma = getPrismaClient()
    if (!prisma) {
      debugInfo.error = 'Prisma client not initialized'
      return NextResponse.json(debugInfo, { status: 500 })
    }

    // Step 3: データベース接続テスト
    debugInfo.step = 3
    debugInfo.checks.push('Database connection test')
    try {
      await prisma.$connect()
      debugInfo.checks.push('✅ Database connected')
    } catch (error) {
      debugInfo.error = `Database connection failed: ${error}`
      return NextResponse.json(debugInfo, { status: 500 })
    }

    // Step 4: Product テーブル構造確認
    debugInfo.step = 4
    debugInfo.checks.push('Product table structure check')
    try {
      const tableInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'Product' 
        ORDER BY ordinal_position;
      `
      debugInfo.tableStructure = tableInfo
      debugInfo.checks.push('✅ Table structure retrieved')
    } catch (error) {
      debugInfo.error = `Table structure check failed: ${error}`
      return NextResponse.json(debugInfo, { status: 500 })
    }

    // Step 5: 決済フィールド存在確認
    debugInfo.step = 5
    debugInfo.checks.push('Payment fields existence check')
    const paymentFields = ['enablePayment', 'stripeProductId', 'stripePriceId']
    const missingFields: string[] = []
    
    for (const field of paymentFields) {
      const fieldExists = (debugInfo.tableStructure as any[]).some(
        (col: any) => col.column_name === field
      )
      if (!fieldExists) {
        missingFields.push(field)
      }
    }
    
    debugInfo.paymentFieldsStatus = {
      existing: paymentFields.filter(f => !missingFields.includes(f)),
      missing: missingFields
    }

    // Step 6: 簡単なクエリテスト
    debugInfo.step = 6
    debugInfo.checks.push('Simple query test')
    try {
      const productCount = await prisma.product.count()
      debugInfo.productCount = productCount
      debugInfo.checks.push('✅ Simple query successful')
    } catch (error) {
      debugInfo.error = `Simple query failed: ${error}`
      return NextResponse.json(debugInfo, { status: 500 })
    }

    // Step 7: 決済フィールドを含むクエリテスト
    debugInfo.step = 7
    debugInfo.checks.push('Payment fields query test')
    if (missingFields.length === 0) {
      try {
        const testProduct = await prisma.product.findFirst({
          select: {
            id: true,
            name: true,
            enablePayment: true,
            stripeProductId: true,
            stripePriceId: true
          }
        })
        debugInfo.paymentFieldsQueryResult = testProduct
        debugInfo.checks.push('✅ Payment fields query successful')
      } catch (error) {
        debugInfo.error = `Payment fields query failed: ${error}`
        return NextResponse.json(debugInfo, { status: 500 })
      }
    } else {
      debugInfo.checks.push('❌ Skipping payment fields query - missing fields')
    }

    debugInfo.step = 'completed'
    debugInfo.status = 'success'
    debugInfo.recommendation = missingFields.length > 0 
      ? `Run migration API to add missing fields: ${missingFields.join(', ')}`
      : 'All payment fields exist. Issue may be elsewhere.'

    return NextResponse.json(debugInfo)

  } catch (error) {
    console.error('❌ Debug Products API error:', error)
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}