"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type ActionState = { ok: boolean; message: string }

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (user?.role !== "admin") return null
  return user
}

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function revalidate() {
  revalidatePath("/admin/categories")
  revalidatePath("/equipments")
  revalidatePath("/vendors")
  revalidatePath("/prices")
}

export async function createCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAdmin()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const categoryName = text(formData, "categoryName")
  const categoryCode = text(formData, "categoryCode").toUpperCase()
  const parentCategoryId = text(formData, "parentCategoryId") || null
  const sortOrderRaw = parseInt(text(formData, "sortOrder"), 10)

  if (!categoryName) return { ok: false, message: "분류명을 입력해 주세요." }
  if (!categoryCode) return { ok: false, message: "분류 코드를 입력해 주세요." }
  if (!/^[A-Z0-9_]+$/.test(categoryCode)) {
    return { ok: false, message: "분류 코드는 영대문자, 숫자, 언더스코어만 사용 가능합니다." }
  }

  let depth = 1
  if (parentCategoryId) {
    const parent = await prisma.equipment_categories.findUnique({
      where: { category_id: parentCategoryId },
      select: { depth: true },
    })
    if (!parent) return { ok: false, message: "상위 분류를 찾을 수 없습니다." }
    depth = parent.depth + 1
  }

  const maxResult = await prisma.equipment_categories.aggregate({
    where: { parent_category_id: parentCategoryId },
    _max: { sort_order: true },
  })
  const sortOrder =
    Number.isFinite(sortOrderRaw) && sortOrderRaw >= 1
      ? sortOrderRaw
      : (maxResult._max.sort_order ?? 0) + 1

  try {
    await prisma.equipment_categories.create({
      data: {
        parent_category_id: parentCategoryId,
        category_code: categoryCode,
        category_name: categoryName,
        depth,
        sort_order: sortOrder,
        is_active: true,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("category_code")) {
      return { ok: false, message: "이미 사용 중인 분류 코드입니다." }
    }
    throw error
  }

  revalidate()
  return { ok: true, message: "분류를 추가했습니다." }
}

export async function updateCategory(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAdmin()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const categoryId = text(formData, "categoryId")
  const categoryName = text(formData, "categoryName")
  const categoryCode = text(formData, "categoryCode").toUpperCase()
  const sortOrder = parseInt(text(formData, "sortOrder"), 10)

  if (!categoryId) return { ok: false, message: "분류를 찾을 수 없습니다." }
  if (!categoryName) return { ok: false, message: "분류명을 입력해 주세요." }
  if (!categoryCode) return { ok: false, message: "분류 코드를 입력해 주세요." }
  if (!/^[A-Z0-9_]+$/.test(categoryCode)) {
    return { ok: false, message: "분류 코드는 영대문자, 숫자, 언더스코어만 사용 가능합니다." }
  }

  try {
    await prisma.equipment_categories.update({
      where: { category_id: categoryId },
      data: {
        category_code: categoryCode,
        category_name: categoryName,
        ...(Number.isFinite(sortOrder) && sortOrder >= 1 ? { sort_order: sortOrder } : {}),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("category_code")) {
      return { ok: false, message: "이미 사용 중인 분류 코드입니다." }
    }
    throw error
  }

  revalidate()
  return { ok: true, message: "분류를 수정했습니다." }
}

export async function deleteCategory(formData: FormData): Promise<ActionState> {
  const user = await requireAdmin()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const categoryId = text(formData, "categoryId")
  if (!categoryId) return { ok: false, message: "분류를 찾을 수 없습니다." }

  const childCount = await prisma.equipment_categories.count({
    where: { parent_category_id: categoryId },
  })
  if (childCount > 0) {
    return { ok: false, message: "하위 분류가 있어 삭제할 수 없습니다. 하위 분류를 먼저 삭제해 주세요." }
  }

  const equipCount = await prisma.equipments.count({
    where: { category_id: categoryId },
  })
  if (equipCount > 0) {
    return { ok: false, message: `연결된 기자재 ${equipCount}개가 있어 삭제할 수 없습니다.` }
  }

  await prisma.equipment_categories.delete({ where: { category_id: categoryId } })

  revalidate()
  return { ok: true, message: "삭제했습니다." }
}

export async function toggleCategoryActive(formData: FormData) {
  const user = await requireAdmin()
  if (!user) return

  const categoryId = text(formData, "categoryId")
  const isActive = formData.get("isActive") === "true"

  await prisma.equipment_categories.update({
    where: { category_id: categoryId },
    data: { is_active: !isActive },
  })

  revalidate()
}
