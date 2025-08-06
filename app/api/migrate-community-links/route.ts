import { NextRequest, NextResponse } from 'next/server'
import { getPrismaClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting community links migration...')
    
    const prisma = getPrismaClient()
    if (!prisma) {
      return NextResponse.json({ 
        error: 'Database connection failed',
        details: 'Prisma client not initialized' 
      }, { status: 503 })
    }

    // コミュニティリンクフィールドをCourseテーブルに追加
    try {
      await prisma.$executeRaw`
        ALTER TABLE "Course" 
        ADD COLUMN IF NOT EXISTS "communityLinkText" TEXT,
        ADD COLUMN IF NOT EXISTS "communityLinkUrl" TEXT
      `
      console.log('✅ Community link fields added to Course table')
    } catch (error) {
      console.log('ℹ️ Community link fields might already exist:', error)
    }

    // 現在のCourseデータを確認
    const courses = await prisma.course.findMany({
      select: {
        id: true,
        name: true,
        communityLinkText: true,
        communityLinkUrl: true
      }
    })

    console.log(`✅ Migration completed. Found ${courses.length} courses`)

    return NextResponse.json({
      success: true,
      message: 'Community links migration completed successfully',
      coursesCount: courses.length,
      courses: courses.map(c => ({
        id: c.id,
        name: c.name,
        hasCommunityLink: !!c.communityLinkUrl
      }))
    })

  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}