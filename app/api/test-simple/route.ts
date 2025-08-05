import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  console.log('🧪 Simple test API called')
  
  return NextResponse.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'API is working',
    environment: process.env.NODE_ENV,
    databaseUrlExists: !!process.env.DATABASE_URL
  })
}