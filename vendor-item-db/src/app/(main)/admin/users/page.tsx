import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getPermissions } from "@/lib/permissions"
import { UserManagementPanel, type UserRowData } from "./user-management"

export default async function UsersPage() {
  const session = await auth()
  const perms = getPermissions(session)
  if (!perms.canManageUsers) redirect("/admin")

  const [users, roles] = await Promise.all([
    prisma.users.findMany({
      orderBy: [{ is_active: "desc" }, { username: "asc" }],
      include: { user_roles: { select: { role_name: true } } },
    }),
    prisma.user_roles.findMany({
      orderBy: [{ sort_order: "asc" }, { role_name: "asc" }],
      select: { role_id: true, role_name: true },
    }),
  ])

  const userRows: UserRowData[] = users.map((u) => ({
    user_id: u.user_id,
    username: u.username,
    email: u.email,
    display_name: u.display_name,
    role: u.role,
    role_id: u.role_id,
    role_name: u.user_roles?.role_name ?? null,
    is_active: u.is_active,
    last_login_at: u.last_login_at?.toISOString() ?? null,
  }))

  return (
    <div className="space-y-5">
      <div>
        <nav className="text-sm text-muted-foreground mb-1">
          <a href="/admin" className="hover:underline">관리</a>
          {" / "}
          <span>사용자 관리</span>
        </nav>
        <h1 className="text-xl font-semibold">사용자 관리</h1>
        <p className="text-sm text-muted-foreground">
          총 {users.length}명 · 활성 {users.filter((u) => u.is_active).length}명
        </p>
      </div>

      <UserManagementPanel users={userRows} roles={roles} />
    </div>
  )
}
