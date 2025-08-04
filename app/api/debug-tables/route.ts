import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json(
        { error: 'Prismaクライアントが初期化されていません' },
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Checking database tables...')
    await prisma.$connect()

    // テーブル一覧を取得
    const tables = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    ` as any[]

    // 各テーブルのレコード数を確認
    const tableCounts: any = {}
    
    const tableNames = ['Customer', 'Course', 'Tag', 'Category', 'Product', 'ShippingRate', 'SystemSettings', 'EmailSettings', 'EmailTemplate']
    
    for (const tableName of tableNames) {
      try {
        const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${tableName}"`) as any[]
        tableCounts[tableName] = parseInt(count[0].count)
      } catch (error) {
        tableCounts[tableName] = `Error: ${error instanceof Error ? error.message : 'Unknown'}`
      }
    }

    // テーブル構造の整理
    const tableStructure: any = {}
    tables.forEach((row: any) => {
      if (!tableStructure[row.table_name]) {
        tableStructure[row.table_name] = []
      }
      tableStructure[row.table_name].push({
        column: row.column_name,
        type: row.data_type
      })
    })

    return NextResponse.json({
      message: 'データベーステーブル情報',
      tableCounts,
      tableStructure,
      totalTables: Object.keys(tableStructure).length
    }, {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: `デバッグエラー: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } finally {
    const prisma = getPrismaClient()
    if (prisma) {
      await prisma.$disconnect()
    }
  }
}