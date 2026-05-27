import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getPermissions } from "@/lib/permissions"
import { RoleManagementPanel } from "./role-management"

export default async function RolesPage() {
  const session = await auth()
  const perms = getPermissions(session)
  if (!perms.canManageUsers) redirect("/admin")

  const roles = await prisma.user_roles.findMany({
    orderBy: [{ sort_order: "asc" }, { role_name: "asc" }],
    include: { _count: { select: { users: true } } },
  })

  const rows = roles.map((role) => ({
    role_id: role.role_id,
    role_name: role.role_name,
    description: role.description,
    can_manage_users: role.can_manage_users,
    can_manage_categories: role.can_manage_categories,
    can_manage_equipment: role.can_manage_equipment,
    can_manage_vendors: role.can_manage_vendors,
    can_manage_prices: role.can_manage_prices,
    can_view_execution_price: role.can_view_execution_price,
    can_manage_evaluations: role.can_manage_evaluations,
    can_access_admin: role.can_access_admin,
    sort_order: role.sort_order,
    user_count: role._count.users,
  }))

  return (
    <div className="space-y-5">
      <div>
        <nav className="text-sm text-muted-foreground mb-1">
          <a href="/admin" className="hover:underline">관리</a>
          {" / "}
          <span>역할 관리</span>
        </nav>
        <h1 className="text-xl font-semibold">역할 관리</h1>
        <p className="text-sm text-muted-foreground">
          총 {roles.length}개 역할
        </p>
      </div>

      <RoleManagementPanel roles={rows} />
    </div>
  )
}
