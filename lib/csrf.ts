import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// CSRF token generation using built-in crypto
function generateCSRFToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Add CSRF token to response
export function addCSRFToken(response: NextResponse): NextResponse {
  const token = generateCSRFToken()
  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 // 24 hours
  })
  response.headers.set('X-CSRF-Token', token)
  return response
}

// Validate CSRF token
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true
  }

  // Skip CSRF for NextAuth endpoints
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    return true
  }

  // Get token from cookie and header
  const cookieToken = request.cookies.get('csrf-token')?.value
  const headerToken = request.headers.get('X-CSRF-Token') || 
                     request.headers.get('x-csrf-token')

  if (!cookieToken || !headerToken) {
    return false
  }

  // Simple constant-time comparison
  return cookieToken === headerToken
}

// CSRF protection middleware for API routes
export async function csrfProtection(request: NextRequest): Promise<NextResponse | null> {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return null
  }

  // Validate token
  const isValid = await validateCSRFToken(request)
  
  if (!isValid) {
    return NextResponse.json(
      { error: 'CSRF token validation failed' },
      { status: 403 }
    )
  }

  return null
}

// Get CSRF token for client-side use
export function getCSRFToken(request: NextRequest): string | null {
  return request.cookies.get('csrf-token')?.value || null
}