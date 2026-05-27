export type Permissions = {
  canManageUsers: boolean
  canManageCategories: boolean
  canManageEquipment: boolean
  canManageVendors: boolean
  canManagePrices: boolean
  canViewExecutionPrice: boolean
  canManageEvaluations: boolean
  canAccessAdmin: boolean
}

export function derivePermissions(token: Record<string, unknown>): Permissions {
  // role_id가 있으면 DB에서 로드된 권한 플래그 사용
  if (token.roleId) {
    return {
      canManageUsers: Boolean(token.canManageUsers),
      canManageCategories: Boolean(token.canManageCategories),
      canManageEquipment: Boolean(token.canManageEquipment),
      canManageVendors: Boolean(token.canManageVendors),
      canManagePrices: Boolean(token.canManagePrices),
      canViewExecutionPrice: Boolean(token.canViewExecutionPrice),
      canManageEvaluations: Boolean(token.canManageEvaluations),
      canAccessAdmin: Boolean(token.canAccessAdmin),
    }
  }
  // 레거시 role 문자열 폴백
  const role = String(token.role ?? "")
  const isAdmin = role === "admin"
  const isProcurement = role === "procurement"
  const isEngineer = role === "engineer"
  return {
    canManageUsers: isAdmin,
    canManageCategories: isAdmin,
    canManageEquipment: isAdmin || isEngineer,
    canManageVendors: isAdmin,
    canManagePrices: isAdmin || isProcurement,
    canViewExecutionPrice: isAdmin || isProcurement,
    canManageEvaluations: isAdmin || isProcurement,
    canAccessAdmin: isAdmin || isProcurement,
  }
}

export function getPermissions(session: { user?: unknown } | null): Permissions {
  const u = session?.user as Record<string, unknown> | undefined
  return derivePermissions(u ?? {})
}
