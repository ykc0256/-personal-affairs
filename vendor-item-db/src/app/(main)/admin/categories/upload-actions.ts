"use server"

import * as XLSX from "xlsx"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

async function requireAdmin() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (user?.role !== "admin") return null
  return user
}

export type UploadResult = {
  ok: boolean
  message: string
  created: number
  updated: number
  errors: { row: number; code: string; message: string }[]
}

const EMPTY_RESULT: UploadResult = { ok: false, message: "", created: 0, updated: 0, errors: [] }

export async function uploadCategoriesExcel(
  _prev: UploadResult,
  formData: FormData
): Promise<UploadResult> {
  const user = await requireAdmin()
  if (!user) return { ...EMPTY_RESULT, message: "권한이 없습니다." }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) return { ...EMPTY_RESULT, message: "파일을 선택해 주세요." }

  // Parse Excel
  let rawRows: string[][]
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" })
  } catch {
    return { ...EMPTY_RESULT, message: "파일을 읽을 수 없습니다. Excel(.xlsx) 또는 CSV 파일인지 확인해 주세요." }
  }

  // Skip header, filter empty rows
  const dataRows = rawRows
    .slice(1)
    .map((row, i) => ({ row, rowIndex: i + 2 }))
    .filter(({ row }) => String(row[0] ?? "").trim() || String(row[1] ?? "").trim())

  if (dataRows.length === 0) return { ...EMPTY_RESULT, message: "데이터가 없습니다. 헤더 아래에 내용을 입력해 주세요." }

  // Validate and parse
  type ParsedRow = {
    rowIndex: number
    categoryCode: string
    categoryName: string
    parentCode: string | null
    sortOrder: number | null
  }

  const parsed: ParsedRow[] = []
  const validationErrors: UploadResult["errors"] = []

  for (const { row, rowIndex } of dataRows) {
    const categoryCode = String(row[0] ?? "").trim().toUpperCase()
    const categoryName = String(row[1] ?? "").trim()
    const parentCode = String(row[2] ?? "").trim().toUpperCase() || null
    const sortOrderRaw = parseInt(String(row[3] ?? "").trim(), 10)
    const sortOrder = Number.isFinite(sortOrderRaw) && sortOrderRaw >= 1 ? sortOrderRaw : null

    if (!categoryCode) {
      validationErrors.push({ row: rowIndex, code: "-", message: "분류코드가 없습니다." })
      continue
    }
    if (!categoryName) {
      validationErrors.push({ row: rowIndex, code: categoryCode, message: "분류명이 없습니다." })
      continue
    }
    if (!/^[A-Z0-9_]+$/.test(categoryCode)) {
      validationErrors.push({ row: rowIndex, code: categoryCode, message: "코드는 영대문자·숫자·_ 만 사용 가능합니다." })
      continue
    }

    parsed.push({ rowIndex, categoryCode, categoryName, parentCode, sortOrder })
  }

  if (parsed.length === 0) {
    return { ok: false, message: "유효한 데이터가 없습니다.", created: 0, updated: 0, errors: validationErrors }
  }

  // Fetch all existing categories
  const existing = await prisma.equipment_categories.findMany({
    select: { category_id: true, category_code: true, depth: true },
  })
  const byCode = new Map(existing.map((c) => [c.category_code, c]))

  // Topological sort — parents before children
  const sorted: ParsedRow[] = []
  const queue = [...parsed]
  let maxPass = parsed.length + 1

  while (queue.length > 0 && maxPass-- > 0) {
    const processable = queue.filter((r) => {
      if (!r.parentCode) return true
      return byCode.has(r.parentCode) || sorted.some((s) => s.categoryCode === r.parentCode)
    })
    if (processable.length === 0) break

    sorted.push(...processable)
    for (const p of processable) {
      queue.splice(queue.indexOf(p), 1)
    }
  }

  // Remaining have unresolvable parents
  for (const r of queue) {
    validationErrors.push({
      row: r.rowIndex,
      code: r.categoryCode,
      message: `상위분류코드 "${r.parentCode}"를 찾을 수 없습니다.`,
    })
  }

  // Upsert in order
  let created = 0
  let updated = 0

  for (const row of sorted) {
    let parentId: string | null = null
    let depth = 1

    if (row.parentCode) {
      const parent = byCode.get(row.parentCode)
      if (!parent) {
        validationErrors.push({ row: row.rowIndex, code: row.categoryCode, message: `상위분류 처리 오류` })
        continue
      }
      parentId = parent.category_id
      depth = parent.depth + 1
    }

    const maxSortResult = await prisma.equipment_categories.aggregate({
      where: { parent_category_id: parentId },
      _max: { sort_order: true },
    })
    const sortOrder = row.sortOrder ?? (maxSortResult._max.sort_order ?? 0) + 1

    const existingCat = byCode.get(row.categoryCode)

    if (existingCat) {
      await prisma.equipment_categories.update({
        where: { category_id: existingCat.category_id },
        data: { category_name: row.categoryName, depth, sort_order: sortOrder },
      })
      byCode.set(row.categoryCode, { ...existingCat, depth })
      updated++
    } else {
      const newCat = await prisma.equipment_categories.create({
        data: {
          parent_category_id: parentId,
          category_code: row.categoryCode,
          category_name: row.categoryName,
          depth,
          sort_order: sortOrder,
          is_active: true,
        },
        select: { category_id: true, category_code: true, depth: true },
      })
      byCode.set(row.categoryCode, newCat)
      created++
    }
  }

  revalidatePath("/admin/categories")
  revalidatePath("/equipments")
  revalidatePath("/vendors")

  const errorSuffix = validationErrors.length > 0 ? `, 오류 ${validationErrors.length}건` : ""
  return {
    ok: true,
    message: `완료: 신규 ${created}개 추가, ${updated}개 업데이트${errorSuffix}`,
    created,
    updated,
    errors: validationErrors,
  }
}
