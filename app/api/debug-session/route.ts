import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({
        hasSession: false,
        message: 'No session found'
      })
    }

    return NextResponse.json({
      hasSession: true,
      user: {
        id: session.user?.id,
        email: session.user?.email,
        name: session.user?.name,
        role: session.user?.role,
        userType: session.user?.userType,
        image: session.user?.image
      },
      expires: session.expires
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get session',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}