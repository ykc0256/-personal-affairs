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

export type VendorUploadResult = {
  ok: boolean
  message: string
  created: number
  updated: number
  errors: { row: number; code: string; message: string }[]
}

const EMPTY: VendorUploadResult = { ok: false, message: "", created: 0, updated: 0, errors: [] }

export async function uploadVendorsExcel(
  _prev: VendorUploadResult,
  formData: FormData
): Promise<VendorUploadResult> {
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
    .filter(({ row }) => String(row[0] ?? "").trim() || String(row[1] ?? "").trim())

  if (dataRows.length === 0)
    return { ...EMPTY, message: "데이터가 없습니다. 헤더 아래에 내용을 입력해 주세요." }

  type ParsedRow = {
    rowIndex: number
    vendorCode: string
    vendorName: string
    vendorType: string | null
    country: string | null
    businessNo: string | null
    financialGrade: string | null
    revenueBaseYear: number | null
    notes: string | null
  }

  const parsed: ParsedRow[] = []
  const validationErrors: VendorUploadResult["errors"] = []

  for (const { row, rowIndex } of dataRows) {
    const vendorCode = String(row[0] ?? "").trim().toUpperCase()
    const vendorName = String(row[1] ?? "").trim()
    const vendorType = String(row[2] ?? "").trim() || null
    const country = String(row[3] ?? "").trim() || null
    const businessNo = String(row[4] ?? "").trim() || null
    const financialGrade = String(row[5] ?? "").trim() || null
    const revenueBaseYearRaw = parseInt(String(row[6] ?? "").trim(), 10)
    const revenueBaseYear = Number.isFinite(revenueBaseYearRaw) ? revenueBaseYearRaw : null
    const notes = String(row[7] ?? "").trim() || null

    if (!vendorCode) {
      validationErrors.push({ row: rowIndex, code: "-", message: "업체코드가 없습니다." })
      continue
    }
    if (!vendorName) {
      validationErrors.push({ row: rowIndex, code: vendorCode, message: "업체명이 없습니다." })
      continue
    }
    if (!/^[A-Z0-9_]+$/.test(vendorCode)) {
      validationErrors.push({ row: rowIndex, code: vendorCode, message: "코드는 영대문자·숫자·_ 만 사용 가능합니다." })
      continue
    }

    parsed.push({ rowIndex, vendorCode, vendorName, vendorType, country, businessNo, financialGrade, revenueBaseYear, notes })
  }

  if (parsed.length === 0)
    return { ok: false, message: "유효한 데이터가 없습니다.", created: 0, updated: 0, errors: validationErrors }

  const existing = await prisma.vendors.findMany({
    where: { vendor_code: { in: parsed.map((r) => r.vendorCode) } },
    select: { vendor_id: true, vendor_code: true },
  })
  const byCode = new Map(existing.map((v) => [v.vendor_code, v]))

  let created = 0
  let updated = 0

  for (const row of parsed) {
    const existingVendor = byCode.get(row.vendorCode)
    const data = {
      vendor_name: row.vendorName,
      vendor_type: row.vendorType,
      country: row.country,
      business_no: row.businessNo,
      financial_grade: row.financialGrade,
      revenue_base_year: row.revenueBaseYear,
      notes: row.notes,
    }

    if (existingVendor) {
      await prisma.vendors.update({ where: { vendor_id: existingVendor.vendor_id }, data })
      updated++
    } else {
      await prisma.vendors.create({
        data: { ...data, vendor_code: row.vendorCode, is_active: true },
      })
      created++
    }
  }

  revalidatePath("/vendors")
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
