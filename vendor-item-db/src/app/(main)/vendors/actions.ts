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
  revalidatePath("/vendors")
  revalidatePath("/")
}

export async function createVendor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAdmin()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const vendorName = text(formData, "vendorName")
  const vendorCode = text(formData, "vendorCode").toUpperCase()
  const vendorType = text(formData, "vendorType") || null
  const country = text(formData, "country") || null
  const businessNo = text(formData, "businessNo") || null
  const financialGrade = text(formData, "financialGrade") || null
  const revenueBaseYear = parseInt(text(formData, "revenueBaseYear"), 10)
  const notes = text(formData, "notes") || null

  if (!vendorName) return { ok: false, message: "업체명을 입력해 주세요." }
  if (!vendorCode) return { ok: false, message: "업체 코드를 입력해 주세요." }
  if (!/^[A-Z0-9_]+$/.test(vendorCode))
    return { ok: false, message: "업체 코드는 영대문자·숫자·언더스코어만 사용 가능합니다." }

  try {
    await prisma.vendors.create({
      data: {
        vendor_name: vendorName,
        vendor_code: vendorCode,
        vendor_type: vendorType,
        country,
        business_no: businessNo,
        financial_grade: financialGrade,
        revenue_base_year: Number.isFinite(revenueBaseYear) ? revenueBaseYear : null,
        notes,
        is_active: true,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("vendor_code"))
      return { ok: false, message: "이미 사용 중인 업체 코드입니다." }
    throw error
  }

  revalidate()
  return { ok: true, message: "업체를 등록했습니다." }
}

export async function updateVendor(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAdmin()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const vendorId = text(formData, "vendorId")
  const vendorName = text(formData, "vendorName")
  const vendorCode = text(formData, "vendorCode").toUpperCase()
  const vendorType = text(formData, "vendorType") || null
  const country = text(formData, "country") || null
  const businessNo = text(formData, "businessNo") || null
  const financialGrade = text(formData, "financialGrade") || null
  const revenueBaseYear = parseInt(text(formData, "revenueBaseYear"), 10)
  const notes = text(formData, "notes") || null

  if (!vendorId) return { ok: false, message: "업체를 찾을 수 없습니다." }
  if (!vendorName) return { ok: false, message: "업체명을 입력해 주세요." }
  if (!vendorCode) return { ok: false, message: "업체 코드를 입력해 주세요." }
  if (!/^[A-Z0-9_]+$/.test(vendorCode))
    return { ok: false, message: "업체 코드는 영대문자·숫자·언더스코어만 사용 가능합니다." }

  try {
    await prisma.vendors.update({
      where: { vendor_id: vendorId },
      data: {
        vendor_name: vendorName,
        vendor_code: vendorCode,
        vendor_type: vendorType,
        country,
        business_no: businessNo,
        financial_grade: financialGrade,
        revenue_base_year: Number.isFinite(revenueBaseYear) ? revenueBaseYear : null,
        notes,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes("vendor_code"))
      return { ok: false, message: "이미 사용 중인 업체 코드입니다." }
    throw error
  }

  revalidate()
  return { ok: true, message: "업체 정보를 수정했습니다." }
}

export async function toggleVendorActive(formData: FormData) {
  const user = await requireAdmin()
  if (!user) return

  const vendorId = text(formData, "vendorId")
  const isActive = formData.get("isActive") === "true"

  await prisma.vendors.update({
    where: { vendor_id: vendorId },
    data: { is_active: !isActive },
  })

  revalidate()
}
