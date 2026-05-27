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
  revalidatePath("/admin/evaluation-criteria")
  revalidatePath("/vendors")
}

export async function createCriteria(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAdmin()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const criteriaName = text(formData, "criteriaName")
  const maxScore = parseInt(text(formData, "maxScore"), 10)
  const weight = parseFloat(text(formData, "weight"))
  const description = text(formData, "description") || null
  const sortOrder = parseInt(text(formData, "sortOrder"), 10)

  if (!criteriaName) return { ok: false, message: "기준명을 입력해 주세요." }
  if (!Number.isFinite(maxScore) || maxScore < 1)
    return { ok: false, message: "배점은 1 이상이어야 합니다." }

  const maxSortResult = await prisma.evaluation_criteria.aggregate({ _max: { sort_order: true } })

  await prisma.evaluation_criteria.create({
    data: {
      criteria_name: criteriaName,
      max_score: maxScore,
      weight: Number.isFinite(weight) && weight > 0 ? weight : null,
      description,
      sort_order: Number.isFinite(sortOrder) && sortOrder >= 1 ? sortOrder : (maxSortResult._max.sort_order ?? 0) + 1,
      is_active: true,
    },
  })

  revalidate()
  return { ok: true, message: "평가 기준을 추가했습니다." }
}

export async function updateCriteria(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAdmin()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const criteriaId = text(formData, "criteriaId")
  const criteriaName = text(formData, "criteriaName")
  const maxScore = parseInt(text(formData, "maxScore"), 10)
  const weight = parseFloat(text(formData, "weight"))
  const description = text(formData, "description") || null
  const sortOrder = parseInt(text(formData, "sortOrder"), 10)

  if (!criteriaId) return { ok: false, message: "항목을 찾을 수 없습니다." }
  if (!criteriaName) return { ok: false, message: "기준명을 입력해 주세요." }
  if (!Number.isFinite(maxScore) || maxScore < 1)
    return { ok: false, message: "배점은 1 이상이어야 합니다." }

  await prisma.evaluation_criteria.update({
    where: { criteria_id: criteriaId },
    data: {
      criteria_name: criteriaName,
      max_score: maxScore,
      weight: Number.isFinite(weight) && weight > 0 ? weight : null,
      description,
      ...(Number.isFinite(sortOrder) && sortOrder >= 1 ? { sort_order: sortOrder } : {}),
    },
  })

  revalidate()
  return { ok: true, message: "수정했습니다." }
}

export async function toggleCriteriaActive(formData: FormData) {
  const user = await requireAdmin()
  if (!user) return

  const criteriaId = text(formData, "criteriaId")
  const isActive = formData.get("isActive") === "true"

  await prisma.evaluation_criteria.update({
    where: { criteria_id: criteriaId },
    data: { is_active: !isActive },
  })

  revalidate()
}
