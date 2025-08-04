import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logLogout } from '@/lib/audit'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (session?.user?.id) {
      // Log the logout before the session is destroyed
      await logLogout(session.user.id, request)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging logout:', error)
    return NextResponse.json({ success: true }) // Still return success even if logging fails
  }
}