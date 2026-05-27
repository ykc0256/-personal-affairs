"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { getPermissions } from "@/lib/permissions"

async function requireAdmin() {
  const session = await auth()
  const perms = getPermissions(session)
  if (!perms.canManageUsers) throw new Error("권한이 없습니다")
}

type ActionState = { ok: boolean; message: string }

// DB users.role 체크 제약에 맞는 고정 4개 역할
const DEFAULT_ROLES = [
  {
    role_name: "관리자",
    description: "모든 기능에 접근 가능한 최고 권한",
    sort_order: 1,
    can_manage_users: true,
    can_manage_categories: true,
    can_manage_equipment: true,
    can_manage_vendors: true,
    can_manage_prices: true,
    can_view_execution_price: true,
    can_manage_evaluations: true,
    can_access_admin: true,
  },
  {
    role_name: "조달",
    description: "가격 관리 및 업체 평가 권한",
    sort_order: 2,
    can_manage_users: false,
    can_manage_categories: false,
    can_manage_equipment: false,
    can_manage_vendors: false,
    can_manage_prices: true,
    can_view_execution_price: true,
    can_manage_evaluations: true,
    can_access_admin: true,
  },
  {
    role_name: "엔지니어",
    description: "기자재 등록 및 분류 관리 권한",
    sort_order: 3,
    can_manage_users: false,
    can_manage_categories: true,
    can_manage_equipment: true,
    can_manage_vendors: false,
    can_manage_prices: false,
    can_view_execution_price: false,
    can_manage_evaluations: false,
    can_access_admin: false,
  },
  {
    role_name: "열람",
    description: "기자재·업체 조회만 가능 (기본 권한)",
    sort_order: 4,
    can_manage_users: false,
    can_manage_categories: false,
    can_manage_equipment: false,
    can_manage_vendors: false,
    can_manage_prices: false,
    can_view_execution_price: false,
    can_manage_evaluations: false,
    can_access_admin: false,
  },
]

export async function seedDefaultRoles(): Promise<ActionState> {
  try {
    await requireAdmin()
    for (const role of DEFAULT_ROLES) {
      await prisma.user_roles.upsert({
        where: { role_name: role.role_name },
        create: { ...role, is_system: false },
        update: {},
      })
    }
    revalidatePath("/admin/roles")
    return { ok: true, message: "기본 역할 4개가 설정되었습니다" }
  } catch (e) {
    return { ok: false, message: String(e) }
  }
}

export async function updateRole(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
    const roleId = String(formData.get("roleId") ?? "")
    const existing = await prisma.user_roles.findUnique({ where: { role_id: roleId } })
    if (!existing) return { ok: false, message: "역할을 찾을 수 없습니다" }

    const roleName = String(formData.get("roleName") ?? "").trim()
    if (!roleName) return { ok: false, message: "역할명을 입력해 주세요" }

    await prisma.user_roles.update({
      where: { role_id: roleId },
      data: {
        role_name: roleName,
        description: String(formData.get("description") ?? "").trim() || null,
        can_manage_users: formData.get("canManageUsers") === "true",
        can_manage_categories: formData.get("canManageCategories") === "true",
        can_manage_equipment: formData.get("canManageEquipment") === "true",
        can_manage_vendors: formData.get("canManageVendors") === "true",
        can_manage_prices: formData.get("canManagePrices") === "true",
        can_view_execution_price: formData.get("canViewExecutionPrice") === "true",
        can_manage_evaluations: formData.get("canManageEvaluations") === "true",
        can_access_admin: formData.get("canAccessAdmin") === "true",
        sort_order: parseInt(String(formData.get("sortOrder") ?? "0")) || 0,
      },
    })
    revalidatePath("/admin/roles")
    return { ok: true, message: "역할이 수정되었습니다" }
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false, message: "이미 사용 중인 역할명입니다" }
    return { ok: false, message: String(e) }
  }
}
