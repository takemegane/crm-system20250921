import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './db'
import bcrypt from 'bcryptjs'
import { logLogin } from './audit'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        console.log('🔐 Login attempt:', { email: credentials?.email, hasPassword: !!credentials?.password })
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        try {
          // まず管理者ユーザーを確認
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            }
          })
          console.log('👤 Admin user found:', !!user)

          if (user) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.password
            )
            console.log('🔑 Admin password valid:', isPasswordValid)

            if (isPasswordValid) {
              console.log('✅ Admin login successful')
              // Log successful login
              await logLogin(user.id)

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                userType: 'admin', // 管理者フラグ
              }
            }
          }

          // 管理者が見つからない場合、顧客ユーザーを確認
          const customer = await prisma.customer.findUnique({
            where: {
              email: credentials.email,
              isECUser: true // ECユーザーのみログイン可能
            }
          })
          console.log('🛍️ Customer found:', !!customer, customer?.isECUser)

          if (customer && customer.password) {
            console.log('🔍 Password debug:', {
              inputPassword: credentials.password.substring(0, 3) + '***',
              inputLength: credentials.password.length,
              storedHashPrefix: customer.password.substring(0, 10) + '...'
            })
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              customer.password
            )
            console.log('🔑 Customer password valid:', isPasswordValid)

            if (isPasswordValid) {
              console.log('✅ Customer login successful')
              return {
                id: customer.id,
                email: customer.email,
                name: customer.name,
                role: 'CUSTOMER', // 顧客ロール
                userType: 'customer', // 顧客フラグ
              }
            }
          }

          console.log('❌ Login failed - no valid user found')
          return null
        } catch (error) {
          console.error('Authorization error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false, // デバッグ無効化でJSON manifest問題を解決
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.userType = user.userType
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
        session.user.userType = token.userType as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}