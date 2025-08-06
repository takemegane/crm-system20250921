import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { csrfProtection, addCSRFToken } from './lib/csrf'

export default withAuth(
  async function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    
    console.log('Middleware accessed:', pathname)
    
    // CSRF protection for API routes (excluding protected APIs)
    if (pathname.startsWith('/api/')) {
      // 管理者専用APIパターン（認証・認可システムで既に保護済み）
      const adminAPIPatterns = [
        '/api/products',
        '/api/customers', 
        '/api/courses',
        '/api/tags',
        '/api/admins',
        '/api/email-templates',
        '/api/emails',
        '/api/audit-logs',
        '/api/system-settings',
        '/api/shipping-rates',
        '/api/categories',
        '/api/profile'
      ]
      
      // 顧客向けAPIパターン（認証済みユーザーのみアクセス可能で十分に保護済み）
      const customerAPIPatterns = [
        '/api/cart',
        '/api/orders',
        '/api/customer-profile',
        '/api/customer-enrollments',
        '/api/calculate-shipping'
      ]
      
      const isAdminAPI = adminAPIPatterns.some(pattern => 
        pathname === pattern || pathname.startsWith(pattern + '/'))
      const isCustomerAPI = customerAPIPatterns.some(pattern => 
        pathname === pattern || pathname.startsWith(pattern + '/'))
      
      if (!isAdminAPI && !isCustomerAPI) {
        // 一般APIのみCSRF保護適用
        console.log('Applying CSRF protection for:', pathname)
        const csrfResponse = await csrfProtection(req)
        if (csrfResponse) {
          return csrfResponse
        }
      } else if (isAdminAPI) {
        console.log('Admin API - CSRF protection excluded:', pathname)
      } else if (isCustomerAPI) {
        console.log('Customer API - CSRF protection excluded:', pathname)
      }
    }
    
    if (!token) {
      // トークンがない場合は認証が必要
      return NextResponse.next()
    }
    
    // 既存セッション対応：userTypeがない場合は管理者として扱う
    const userType = token.userType || (token.role === 'OPERATOR' || token.role === 'ADMIN' || token.role === 'OWNER' ? 'admin' : 'customer')
    
    // ログイン後のデフォルトリダイレクト処理（ルートパスアクセス時）
    if (pathname === '/') {
      if (userType === 'customer') {
        console.log('🛍️ Customer accessing root - redirecting to mypage')
        return NextResponse.redirect(new URL('/mypage', req.url))
      } else if (userType === 'admin') {
        console.log('👨‍💼 Admin accessing root - redirecting to dashboard')
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
    
    // 管理者用ダッシュボードアクセス
    if (pathname.startsWith('/dashboard')) {
      if (userType === 'admin') {
        return NextResponse.next()
      } else if (userType === 'customer') {
        // 顧客がダッシュボードにアクセスしようとした場合、マイページにリダイレクト
        console.log('🔄 Customer trying to access dashboard, redirecting to /mypage')
        return NextResponse.redirect(new URL('/mypage', req.url))
      }
    }
    
    // ECサイト・マイページアクセス
    if (pathname.startsWith('/shop') || pathname.startsWith('/mypage')) {
      if (userType === 'customer') {
        // 旧 /shop パスへのアクセスを新 /mypage/shop にリダイレクト
        if (pathname.startsWith('/shop')) {
          const newPath = pathname.replace('/shop', '/mypage/shop')
          console.log('🔄 Redirecting customer from /shop to /mypage/shop:', newPath)
          return NextResponse.redirect(new URL(newPath, req.url))
        }
        return NextResponse.next()
      } else if (userType === 'admin') {
        // 管理者がECサイト・マイページにアクセスしようとした場合、ダッシュボードにリダイレクト
        console.log('🔄 Admin trying to access customer area, redirecting to dashboard')
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
    
    // 管理者専用APIアクセス
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') && !pathname.startsWith('/api/products') && !pathname.startsWith('/api/cart') && !pathname.startsWith('/api/orders') && !pathname.startsWith('/api/categories') && !pathname.startsWith('/api/customer-enrollments')) {
      if (userType === 'admin') {
        const response = NextResponse.next()
        return addCSRFToken(response)
      }
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const response = NextResponse.next()
    return addCSRFToken(response)
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        console.log('Middleware authorization check:', {
          path: pathname,
          token: token ? { role: token.role, userType: token.userType, sub: token.sub } : null
        })
        
        // 認証が必要なパスの場合
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/shop') || pathname.startsWith('/mypage') || pathname.startsWith('/api/')) {
          if (!token) {
            console.log('Authorization result: false (no token)')
            return false
          }
          
          // 既存セッション対応：userTypeがない場合は管理者として扱う
          const userType = token.userType || (token.role === 'OPERATOR' || token.role === 'ADMIN' || token.role === 'OWNER' ? 'admin' : 'customer')
          
          const isAuthorized = (
            (userType === 'admin' && (token.role === 'OPERATOR' || token.role === 'ADMIN' || token.role === 'OWNER')) ||
            (userType === 'customer' && token.role === 'CUSTOMER')
          )
          console.log('Authorization result:', isAuthorized)
          return isAuthorized
        }
        
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/shop/:path*',
    '/mypage/:path*',
    '/api/customers/:path*', 
    '/api/courses/:path*',
    '/api/tags/:path*',
    '/api/admins/:path*',
    '/api/email-templates/:path*',
    '/api/emails/:path*',
    '/api/products/:path*',
    '/api/cart/:path*',
    '/api/orders/:path*',
    '/api/categories/:path*',
    '/api/customer-enrollments/:path*',
    '/api/calculate-shipping/:path*'
  ]
}