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

export type EquipmentUploadResult = {
  ok: boolean
  message: string
  created: number
  updated: number
  errors: { row: number; code: string; message: string }[]
}

const EMPTY: EquipmentUploadResult = { ok: false, message: "", created: 0, updated: 0, errors: [] }

export async function uploadEquipmentsExcel(
  _prev: EquipmentUploadResult,
  formData: FormData
): Promise<EquipmentUploadResult> {
  const user = await requireAdmin()
  if (!user) return { ...EMPTY, message: "권한이 없습니다." }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) return { ...EMPTY, message: "파일을 선택해 주세요." }

  let rawRows: string[][]
  try {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" })
  } catch {
    return { ...EMPTY, message: "파일을 읽을 수 없습니다. Excel(.xlsx) 또는 CSV 파일인지 확인해 주세요." }
  }

  const dataRows = rawRows
    .slice(1)
    .map((row, i) => ({ row, rowIndex: i + 2 }))
    .filter(({ row }) => String(row[0] ?? "").trim())

  if (dataRows.length === 0)
    return { ...EMPTY, message: "데이터가 없습니다. 헤더 아래에 내용을 입력해 주세요." }

  // 분류 코드 → ID 맵
  const allCategories = await prisma.equipment_categories.findMany({
    select: { category_id: true, category_code: true },
  })
  const categoryByCode = new Map(allCategories.map((c) => [c.category_code.toUpperCase(), c.category_id]))

  // 업체 코드 → ID 맵
  const allVendors = await prisma.vendors.findMany({
    select: { vendor_id: true, vendor_code: true },
  })
  const vendorByCode = new Map(allVendors.map((v) => [v.vendor_code.toUpperCase(), v.vendor_id]))

  type ParsedRow = {
    rowIndex: number
    equipmentCode: string
    modelName: string | null
    manufacturerModelNo: string | null
    specification: string | null
    unit: string | null
    categoryId: string | null
    vendorId: string | null
    notes: string | null
  }

  const parsed: ParsedRow[] = []
  const validationErrors: EquipmentUploadResult["errors"] = []

  for (const { row, rowIndex } of dataRows) {
    // A: 기자재코드, B: 모델명, C: 제조사모델번호, D: 규격/사양, E: 단위, F: 분류코드, G: 업체코드, H: 비고
    const equipmentCode = String(row[0] ?? "").trim().toUpperCase()
    const modelName = String(row[1] ?? "").trim() || null
    const manufacturerModelNo = String(row[2] ?? "").trim() || null
    const specification = String(row[3] ?? "").trim() || null
    const unit = String(row[4] ?? "").trim() || null
    const categoryCodeRaw = String(row[5] ?? "").trim().toUpperCase()
    const vendorCodeRaw = String(row[6] ?? "").trim().toUpperCase()
    const notes = String(row[7] ?? "").trim() || null

    if (!equipmentCode) {
      validationErrors.push({ row: rowIndex, code: "-", message: "기자재코드가 없습니다." })
      continue
    }

    let categoryId: string | null = null
    if (categoryCodeRaw) {
      categoryId = categoryByCode.get(categoryCodeRaw) ?? null
      if (!categoryId) {
        validationErrors.push({ row: rowIndex, code: equipmentCode, message: `분류코드 '${categoryCodeRaw}'를 찾을 수 없습니다.` })
        continue
      }
    }

    let vendorId: string | null = null
    if (vendorCodeRaw) {
      vendorId = vendorByCode.get(vendorCodeRaw) ?? null
      if (!vendorId) {
        validationErrors.push({ row: rowIndex, code: equipmentCode, message: `업체코드 '${vendorCodeRaw}'를 찾을 수 없습니다.` })
        continue
      }
    }

    parsed.push({ rowIndex, equipmentCode, modelName, manufacturerModelNo, specification, unit, categoryId, vendorId, notes })
  }

  if (parsed.length === 0)
    return { ok: false, message: "유효한 데이터가 없습니다.", created: 0, updated: 0, errors: validationErrors }

  const existing = await prisma.equipments.findMany({
    where: { equipment_code: { in: parsed.map((r) => r.equipmentCode) } },
    select: { equipment_id: true, equipment_code: true },
  })
  const byCode = new Map(existing.map((e) => [e.equipment_code, e]))

  let created = 0
  let updated = 0

  for (const row of parsed) {
    const existingEq = byCode.get(row.equipmentCode)
    const data = {
      model_name: row.modelName,
      manufacturer_model_no: row.manufacturerModelNo,
      specification: row.specification,
      unit: row.unit,
      category_id: row.categoryId,
      notes: row.notes,
    }

    let equipmentId: string
    if (existingEq) {
      await prisma.equipments.update({ where: { equipment_id: existingEq.equipment_id }, data })
      equipmentId = existingEq.equipment_id
      updated++
    } else {
      const created_eq = await prisma.equipments.create({
        data: { ...data, equipment_code: row.equipmentCode, is_active: true },
        select: { equipment_id: true },
      })
      equipmentId = created_eq.equipment_id
      created++
    }

    // 업체 연결 (없으면 생성, 이미 있으면 skip)
    if (row.vendorId) {
      const existingItem = await prisma.vendor_items.findFirst({
        where: { vendor_id: row.vendorId, equipment_id: equipmentId },
        select: { vendor_item_id: true },
      })
      if (!existingItem) {
        await prisma.vendor_items.create({
          data: { vendor_id: row.vendorId, equipment_id: equipmentId, is_active: true },
        })
      }
    }
  }

  revalidatePath("/equipments")
  revalidatePath("/")

  const errorSuffix = validationErrors.length > 0 ? `, 오류 ${validationErrors.length}건` : ""
  return {
    ok: true,
    message: `완료: 신규 ${created}개 추가, ${updated}개 업데이트${errorSuffix}`,
    created,
    updated,
    errors: validationErrors,
  }
}
