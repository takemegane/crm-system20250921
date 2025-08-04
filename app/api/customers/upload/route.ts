import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission, UserRole } from '@/lib/permissions'

// 静的生成を無効にして動的ルートとして扱う
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface CSVRow {
  name: string
  nameKana: string
  email: string
  phone: string
  address: string
  birthDate: string
  gender: string
  joinedAt: string
  courses?: string
  tags?: string
}

export async function POST(request: NextRequest) {
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

    if (!session || !hasPermission(session.user.role as UserRole, 'CREATE_CUSTOMERS')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      )
    }

    const content = await file.text()
    const lines = content.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'CSV file must contain at least a header and one data row' },
        { status: 400 }
      )
    }

    // CSVヘッダーを解析
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    // 必須カラムの確認（フリガナ、生年月日、性別を追加）
    const requiredColumns = ['name', 'nameKana', 'email', 'phone', 'address', 'birthDate', 'gender', 'joinedAt']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    
    if (missingColumns.length > 0) {
      return NextResponse.json(
        { error: `Missing required columns: ${missingColumns.join(', ')}` },
        { status: 400 }
      )
    }

    // データ行を解析
    const rows: CSVRow[] = []
    const errors: string[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`)
        continue
      }

      const row: CSVRow = { name: '', nameKana: '', email: '', phone: '', address: '', birthDate: '', gender: '', joinedAt: '' }
      
      headers.forEach((header, index) => {
        const value = values[index]
        switch (header.toLowerCase()) {
          case 'name':
            row.name = value
            break
          case 'namekana':
          case 'name_kana':
            row.nameKana = value
            break
          case 'email':
            row.email = value
            break
          case 'phone':
            row.phone = value
            break
          case 'address':
            row.address = value
            break
          case 'birthdate':
          case 'birth_date':
            row.birthDate = value
            break
          case 'gender':
            row.gender = value
            break
          case 'joinedat':
          case 'joined_at':
            row.joinedAt = value
            break
          case 'courses':
            row.courses = value || undefined
            break
          case 'tags':
            row.tags = value || undefined
            break
        }
      })

      // 必須フィールドの検証（全フィールドが必須）
      if (!row.name || !row.nameKana || !row.email || !row.phone || !row.address || !row.birthDate || !row.gender || !row.joinedAt) {
        errors.push(`Row ${i + 1}: All fields (name, nameKana, email, phone, address, birthDate, gender, joinedAt) are required`)
        continue
      }

      // メールアドレスの簡易検証
      if (!row.email.includes('@')) {
        errors.push(`Row ${i + 1}: Invalid email format`)
        continue
      }

      rows.push(row)
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation errors', details: errors },
        { status: 400 }
      )
    }

    // データベースに一括挿入
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const row of rows) {
      try {
        // 既存の顧客をチェック
        const existingCustomer = await prisma!.customer.findUnique({
          where: { email: row.email },
        })

        if (existingCustomer) {
          results.failed++
          results.errors.push(`Email ${row.email} already exists`)
          continue
        }

        // コース名とタグ名を処理
        const courseNames = row.courses ? row.courses.split(';').map(c => c.trim()).filter(Boolean) : []
        const tagNames = row.tags ? row.tags.split(';').map(t => t.trim()).filter(Boolean) : []

        // コースIDを取得
        const courseIds: string[] = []
        if (courseNames.length > 0) {
          const courses = await prisma!.course.findMany({
            where: {
              name: { in: courseNames },
              isActive: true
            }
          })
          courseIds.push(...courses.map(c => c.id))
        }

        // タグIDを取得
        const tagIds: string[] = []
        if (tagNames.length > 0) {
          const tags = await prisma!.tag.findMany({
            where: { name: { in: tagNames } }
          })
          tagIds.push(...tags.map(t => t.id))
        }

        // 顧客を作成（フリガナ、生年月日、性別を追加）
        const customer = await prisma!.customer.create({
          data: {
            name: row.name,
            nameKana: row.nameKana,
            email: row.email,
            phone: row.phone,
            address: row.address,
            birthDate: new Date(row.birthDate),
            gender: row.gender,
            joinedAt: new Date(row.joinedAt),
          },
        })

        // コースの登録
        if (courseIds.length > 0) {
          await prisma!.enrollment.createMany({
            data: courseIds.map(courseId => ({
              customerId: customer.id,
              courseId,
              enrolledAt: new Date(),
              status: 'ENROLLED'
            }))
          })
        }

        // タグの付与
        if (tagIds.length > 0) {
          await prisma!.customerTag.createMany({
            data: tagIds.map(tagId => ({
              customerId: customer.id,
              tagId
            }))
          })
        }

        results.success++
      } catch (error) {
        results.failed++
        results.errors.push(`Failed to create customer ${row.email}: ${error}`)
      }
    }

    return NextResponse.json({
      message: `Import completed. ${results.success} customers created, ${results.failed} failed.`,
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Error uploading CSV:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}