import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { authConfig } from "@/auth.config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const user = await prisma.users.findUnique({
          where: { username: credentials.username as string },
          include: { user_roles: true },
        })

        if (!user || !user.is_active) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        )
        if (!isValid) return null

        await prisma.users.update({
          where: { user_id: user.user_id },
          data: { last_login_at: new Date() },
        })

        const r = user.user_roles
        return {
          id: user.user_id,
          name: user.display_name ?? user.username,
          email: user.email,
          role: user.role,
          roleId: user.role_id,
          canManageUsers: r?.can_manage_users ?? false,
          canManageCategories: r?.can_manage_categories ?? false,
          canManageEquipment: r?.can_manage_equipment ?? false,
          canManageVendors: r?.can_manage_vendors ?? false,
          canManagePrices: r?.can_manage_prices ?? false,
          canViewExecutionPrice: r?.can_view_execution_price ?? false,
          canManageEvaluations: r?.can_manage_evaluations ?? false,
          canAccessAdmin: r?.can_access_admin ?? false,
        }
      },
    }),
  ],
})
