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
  revalidatePath("/admin/references")
  revalidatePath("/vendors")
}

// ── Vendor Types ────────────────────────────────────────────────────────────

export async function createVendorType(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) return { ok: false, message: "권한이 없습니다." }

  const typeName = text(formData, "typeName")
  const sortOrder = parseInt(text(formData, "sortOrder"), 10)
  if (!typeName) return { ok: false, message: "유형명을 입력해 주세요." }

  const maxSort = await prisma.vendor_types.aggregate({ _max: { sort_order: true } })
  await prisma.vendor_types.create({
    data: {
      type_name: typeName,
      sort_order: Number.isFinite(sortOrder) && sortOrder >= 0
        ? sortOrder
        : (maxSort._max.sort_order ?? 0) + 1,
    },
  })

  revalidate()
  return { ok: true, message: "업체 유형을 추가했습니다." }
}

export async function updateVendorType(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) return { ok: false, message: "권한이 없습니다." }

  const typeId = text(formData, "typeId")
  const typeName = text(formData, "typeName")
  const sortOrder = parseInt(text(formData, "sortOrder"), 10)
  if (!typeId) return { ok: false, message: "항목을 찾을 수 없습니다." }
  if (!typeName) return { ok: false, message: "유형명을 입력해 주세요." }

  await prisma.vendor_types.update({
    where: { type_id: typeId },
    data: {
      type_name: typeName,
      ...(Number.isFinite(sortOrder) && sortOrder >= 0 ? { sort_order: sortOrder } : {}),
    },
  })

  revalidate()
  return { ok: true, message: "수정했습니다." }
}

export async function toggleVendorTypeActive(formData: FormData) {
  if (!(await requireAdmin())) return
  const typeId = text(formData, "typeId")
  const isActive = formData.get("isActive") === "true"
  await prisma.vendor_types.update({ where: { type_id: typeId }, data: { is_active: !isActive } })
  revalidate()
}

export async function deleteVendorType(formData: FormData) {
  if (!(await requireAdmin())) return
  const typeId = text(formData, "typeId")
  await prisma.vendor_types.delete({ where: { type_id: typeId } })
  revalidate()
}

// ── Countries ────────────────────────────────────────────────────────────────

export async function createCountry(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) return { ok: false, message: "권한이 없습니다." }

  const countryName = text(formData, "countryName")
  const sortOrder = parseInt(text(formData, "sortOrder"), 10)
  if (!countryName) return { ok: false, message: "국가명을 입력해 주세요." }

  const maxSort = await prisma.countries.aggregate({ _max: { sort_order: true } })
  await prisma.countries.create({
    data: {
      country_name: countryName,
      sort_order: Number.isFinite(sortOrder) && sortOrder >= 0
        ? sortOrder
        : (maxSort._max.sort_order ?? 0) + 1,
    },
  })

  revalidate()
  return { ok: true, message: "국가를 추가했습니다." }
}

export async function updateCountry(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) return { ok: false, message: "권한이 없습니다." }

  const countryId = text(formData, "countryId")
  const countryName = text(formData, "countryName")
  const sortOrder = parseInt(text(formData, "sortOrder"), 10)
  if (!countryId) return { ok: false, message: "항목을 찾을 수 없습니다." }
  if (!countryName) return { ok: false, message: "국가명을 입력해 주세요." }

  await prisma.countries.update({
    where: { country_id: countryId },
    data: {
      country_name: countryName,
      ...(Number.isFinite(sortOrder) && sortOrder >= 0 ? { sort_order: sortOrder } : {}),
    },
  })

  revalidate()
  return { ok: true, message: "수정했습니다." }
}

export async function toggleCountryActive(formData: FormData) {
  if (!(await requireAdmin())) return
  const countryId = text(formData, "countryId")
  const isActive = formData.get("isActive") === "true"
  await prisma.countries.update({ where: { country_id: countryId }, data: { is_active: !isActive } })
  revalidate()
}

export async function deleteCountry(formData: FormData) {
  if (!(await requireAdmin())) return
  const countryId = text(formData, "countryId")
  await prisma.countries.delete({ where: { country_id: countryId } })
  revalidate()
}

// ── Seed Defaults ────────────────────────────────────────────────────────────

export async function seedDefaults(
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  if (!(await requireAdmin())) return { ok: false, message: "권한이 없습니다." }

  const [typeCount, countryCount] = await Promise.all([
    prisma.vendor_types.count(),
    prisma.countries.count(),
  ])

  const typeInserts = typeCount === 0
    ? prisma.vendor_types.createMany({
        data: [
          { type_name: "제조사", sort_order: 1 },
          { type_name: "대리점", sort_order: 2 },
          { type_name: "시공사", sort_order: 3 },
          { type_name: "수입사", sort_order: 4 },
          { type_name: "기타", sort_order: 5 },
        ],
      })
    : Promise.resolve()

  const countryInserts = countryCount === 0
    ? prisma.countries.createMany({
        data: [
          { country_name: "대한민국", sort_order: 1 },
          { country_name: "독일", sort_order: 2 },
          { country_name: "미국", sort_order: 3 },
          { country_name: "일본", sort_order: 4 },
          { country_name: "중국", sort_order: 5 },
          { country_name: "영국", sort_order: 6 },
          { country_name: "프랑스", sort_order: 7 },
          { country_name: "이탈리아", sort_order: 8 },
          { country_name: "스위스", sort_order: 9 },
          { country_name: "스웨덴", sort_order: 10 },
          { country_name: "핀란드", sort_order: 11 },
          { country_name: "덴마크", sort_order: 12 },
        ],
      })
    : Promise.resolve()

  await Promise.all([typeInserts, countryInserts])

  revalidate()
  return { ok: true, message: "기본값을 설정했습니다." }
}
