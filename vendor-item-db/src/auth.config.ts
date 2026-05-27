import type { NextAuthConfig } from "next-auth"

// Proxy에서 DB 접근 없이 쿠키 기반 확인만 수행하기 위한 공통 인증 설정
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isLoginPage = nextUrl.pathname === "/login"
      if (!isLoggedIn && !isLoginPage) return false
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/", nextUrl))
      }
      return true
    },
    jwt({ token, user }) {
      if (user) {
        const u = user as {
          role?: string
          roleId?: string
          canManageUsers?: boolean
          canManageCategories?: boolean
          canManageEquipment?: boolean
          canManageVendors?: boolean
          canManagePrices?: boolean
          canViewExecutionPrice?: boolean
          canManageEvaluations?: boolean
          canAccessAdmin?: boolean
        }
        token.role = u.role
        token.roleId = u.roleId
        token.canManageUsers = u.canManageUsers
        token.canManageCategories = u.canManageCategories
        token.canManageEquipment = u.canManageEquipment
        token.canManageVendors = u.canManageVendors
        token.canManagePrices = u.canManagePrices
        token.canViewExecutionPrice = u.canViewExecutionPrice
        token.canManageEvaluations = u.canManageEvaluations
        token.canAccessAdmin = u.canAccessAdmin
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!
        const s = session.user as unknown as Record<string, unknown>
        s.role = token.role
        s.roleId = token.roleId
        s.canManageUsers = token.canManageUsers
        s.canManageCategories = token.canManageCategories
        s.canManageEquipment = token.canManageEquipment
        s.canManageVendors = token.canManageVendors
        s.canManagePrices = token.canManagePrices
        s.canViewExecutionPrice = token.canViewExecutionPrice
        s.canManageEvaluations = token.canManageEvaluations
        s.canAccessAdmin = token.canAccessAdmin
      }
      return session
    },
  },
}
