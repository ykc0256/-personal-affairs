"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"

type ActionState = {
  ok: boolean
  message: string
}

type EquipmentPayload =
  | { error: string }
  | {
      data: {
        category_id: string | null
        equipment_code: string
        model_name: string | null
        manufacturer_model_no: string | null
        specification: string | null
        unit: string | null
        gwd_equipment_id: string | null
        notes: string | null
        updated_by: string | null
        updated_at: Date
      }
    }

function text(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || null
}

function parseMoney(value: string) {
  if (!value) return null
  const normalized = value.replaceAll(",", "")
  const amount = Number(normalized)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return new Date(`${value}T00:00:00.000Z`)
}

async function requirePriceManager() {
  const session = await auth()
  if (!getPermissions(session).canManagePrices) return null
  return session?.user as { id?: string } | undefined
}

async function requireEquipmentManager() {
  const session = await auth()
  if (!getPermissions(session).canManageEquipment) return null
  return session?.user as { id?: string } | undefined
}

function optionalUuid(formData: FormData, key: string) {
  const value = text(formData, key)
  return value || null
}

function equipmentPayload(formData: FormData, userId: string | null): EquipmentPayload {
  const equipmentCode = text(formData, "equipmentCode")

  if (!equipmentCode) {
    return { error: "기자재 코드를 입력해 주세요." }
  }

  return {
    data: {
      category_id: optionalUuid(formData, "categoryId"),
      equipment_code: equipmentCode,
      model_name: optionalText(formData, "modelName"),
      manufacturer_model_no: optionalText(formData, "manufacturerModelNo"),
      specification: optionalText(formData, "specification"),
      unit: optionalText(formData, "unit"),
      gwd_equipment_id: optionalText(formData, "gwdEquipmentId"),
      notes: optionalText(formData, "notes"),
      updated_by: userId,
      updated_at: new Date(),
    },
  }
}

export async function createEquipment(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireEquipmentManager()
  if (!user) {
    return { ok: false, message: "기자재를 추가할 권한이 없습니다." }
  }

  const payload = equipmentPayload(formData, user.id ?? null)
  if ("error" in payload) {
    return { ok: false, message: payload.error }
  }

  const vendorId = optionalUuid(formData, "vendorId")

  try {
    await prisma.$transaction(async (tx) => {
      const equipment = await tx.equipments.create({
        data: {
          ...payload.data,
          created_by: user.id ?? null,
          is_active: true,
        },
      })

      if (vendorId) {
        await tx.vendor_items.create({
          data: {
            vendor_id: vendorId,
            equipment_id: equipment.equipment_id,
            is_active: true,
          },
        })
      }
    })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("equipment_code") ||
        error.message.includes("gwd_equipment_id"))
    ) {
      return { ok: false, message: "이미 사용 중인 기자재 코드 또는 GWD ID입니다." }
    }
    throw error
  }

  revalidatePath("/equipments")
  return { ok: true, message: "기자재를 추가했습니다." }
}

export async function updateEquipment(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireEquipmentManager()
  if (!user) {
    return { ok: false, message: "기자재를 수정할 권한이 없습니다." }
  }

  const equipmentId = text(formData, "equipmentId")
  if (!equipmentId) {
    return { ok: false, message: "수정할 기자재를 찾을 수 없습니다." }
  }

  const payload = equipmentPayload(formData, user.id ?? null)
  if ("error" in payload) {
    return { ok: false, message: payload.error }
  }

  try {
    await prisma.equipments.update({
      where: { equipment_id: equipmentId },
      data: payload.data,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("equipment_code") ||
        error.message.includes("gwd_equipment_id"))
    ) {
      return { ok: false, message: "이미 사용 중인 기자재 코드 또는 GWD ID입니다." }
    }
    throw error
  }

  revalidatePath("/equipments")
  revalidatePath(`/equipments/${equipmentId}`)
  return { ok: true, message: "기자재 정보를 수정했습니다." }
}

export async function deactivateEquipment(formData: FormData) {
  const user = await requireEquipmentManager()
  if (!user) return

  const equipmentId = text(formData, "equipmentId")
  if (!equipmentId) return

  await prisma.equipments.update({
    where: { equipment_id: equipmentId },
    data: {
      is_active: false,
      updated_by: user.id ?? null,
      updated_at: new Date(),
    },
  })

  revalidatePath("/equipments")
}

export async function activateEquipment(formData: FormData) {
  const user = await requireEquipmentManager()
  if (!user) return

  const equipmentId = text(formData, "equipmentId")
  if (!equipmentId) return

  await prisma.equipments.update({
    where: { equipment_id: equipmentId },
    data: {
      is_active: true,
      updated_by: user.id ?? null,
      updated_at: new Date(),
    },
  })

  revalidatePath("/equipments")
}

export async function addEquipmentPrice(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requirePriceManager()
  if (!user) {
    return { ok: false, message: "가격을 저장할 권한이 없습니다." }
  }

  const vendorItemId = text(formData, "vendorItemId")
  const vendorId = text(formData, "vendorId")
  const equipmentId = text(formData, "equipmentId")
  const priceDate = parseDate(text(formData, "priceDate"))
  const designPrice = parseMoney(text(formData, "designPrice"))
  const executionPrice = parseMoney(text(formData, "executionPrice"))

  if (!priceDate) {
    return { ok: false, message: "기준일을 입력해 주세요." }
  }

  if (designPrice === null && executionPrice === null) {
    return { ok: false, message: "설계가 또는 실행가 중 하나 이상 입력해 주세요." }
  }

  if (!vendorItemId && (!vendorId || !equipmentId)) {
    return { ok: false, message: "업체 연결이 필요합니다." }
  }

  const createdBy = user.id ?? null
  const currency = text(formData, "currency") || "KRW"
  const designSource = optionalText(formData, "designSource")
  const executionSource = optionalText(formData, "executionSource")
  const note = optionalText(formData, "note")

  const priceDateNext = new Date(priceDate.getTime() + 24 * 60 * 60 * 1000)

  await prisma.$transaction(async (tx) => {
    let vendorItem = vendorItemId
      ? await tx.vendor_items.findUnique({
          where: { vendor_item_id: vendorItemId },
          select: { vendor_id: true, equipment_id: true },
        })
      : null

    if (!vendorItem) {
      const existing = await tx.vendor_items.findFirst({
        where: { vendor_id: vendorId, equipment_id: equipmentId },
        select: { vendor_id: true, equipment_id: true },
      })

      vendorItem =
        existing ??
        (await tx.vendor_items.create({
          data: {
            vendor_id: vendorId,
            equipment_id: equipmentId,
            is_active: true,
          },
          select: { vendor_id: true, equipment_id: true },
        }))
    }

    if (designPrice !== null) {
      await tx.design_prices.updateMany({
        where: {
          vendor_id: vendorItem.vendor_id,
          equipment_id: vendorItem.equipment_id,
          price_date: { gte: priceDate, lt: priceDateNext },
          is_voided: false,
        },
        data: {
          is_voided: true,
          void_reason: "동일 날짜 신규 가격으로 대체",
          updated_by: createdBy,
          updated_at: new Date(),
        },
      })
      await tx.design_prices.create({
        data: {
          vendor_id: vendorItem.vendor_id,
          equipment_id: vendorItem.equipment_id,
          price: designPrice,
          currency,
          price_date: priceDate,
          source: designSource,
          note,
          created_by: createdBy,
          updated_by: createdBy,
        },
      })
    }

    if (executionPrice !== null) {
      await tx.execution_prices.updateMany({
        where: {
          vendor_id: vendorItem.vendor_id,
          equipment_id: vendorItem.equipment_id,
          price_date: { gte: priceDate, lt: priceDateNext },
          is_voided: false,
        },
        data: {
          is_voided: true,
          void_reason: "동일 날짜 신규 가격으로 대체",
          updated_by: createdBy,
          updated_at: new Date(),
        },
      })
      await tx.execution_prices.create({
        data: {
          vendor_id: vendorItem.vendor_id,
          equipment_id: vendorItem.equipment_id,
          price: executionPrice,
          currency,
          price_date: priceDate,
          source: executionSource,
          note,
          created_by: createdBy,
          updated_by: createdBy,
        },
      })
    }
  })

  revalidatePath("/equipments")
  return { ok: true, message: "가격 변경 이력을 추가했습니다." }
}

export async function deleteVoidedPrice(formData: FormData) {
  const user = await requirePriceManager()
  if (!user) return

  const designPriceId = text(formData, "designPriceId")
  const executionPriceId = text(formData, "executionPriceId")

  await prisma.$transaction(async (tx) => {
    if (designPriceId) {
      await tx.design_prices.deleteMany({
        where: { design_price_id: designPriceId, is_voided: true },
      })
    }
    if (executionPriceId) {
      await tx.execution_prices.deleteMany({
        where: { execution_price_id: executionPriceId, is_voided: true },
      })
    }
  })

  revalidatePath("/equipments")
}

export async function deleteEquipment(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireEquipmentManager()
  if (!user) return { ok: false, message: "기자재를 삭제할 권한이 없습니다." }

  const equipmentId = text(formData, "equipmentId")
  if (!equipmentId) return { ok: false, message: "기자재 ID가 없습니다." }

  try {
    await prisma.equipments.delete({ where: { equipment_id: equipmentId } })
    revalidatePath("/equipments")
    return { ok: true, message: "기자재가 삭제되었습니다." }
  } catch (e) {
    if ((e as { code?: string }).code === "P2003") {
      return {
        ok: false,
        message: "연결된 업체 또는 가격 데이터가 있어 삭제할 수 없습니다. 비활성화를 사용해 주세요.",
      }
    }
    return { ok: false, message: String(e) }
  }
}

export async function bulkDeactivateEquipments(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireEquipmentManager()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const ids = text(formData, "equipmentIds").split(",").filter(Boolean)
  if (ids.length === 0) return { ok: false, message: "선택된 항목이 없습니다." }

  await prisma.equipments.updateMany({
    where: { equipment_id: { in: ids } },
    data: { is_active: false, updated_by: user.id ?? null, updated_at: new Date() },
  })
  revalidatePath("/equipments")
  return { ok: true, message: `${ids.length}개 항목이 비활성화되었습니다.` }
}

export async function voidPriceHistory(formData: FormData) {
  const user = await requirePriceManager()
  if (!user) return

  const designPriceId = text(formData, "designPriceId")
  const executionPriceId = text(formData, "executionPriceId")
  const updatedBy = user.id ?? null

  await prisma.$transaction(async (tx) => {
    if (designPriceId) {
      await tx.design_prices.update({
        where: { design_price_id: designPriceId },
        data: {
          is_voided: true,
          void_reason: "사용자 삭제",
          updated_by: updatedBy,
          updated_at: new Date(),
        },
      })
    }

    if (executionPriceId) {
      await tx.execution_prices.update({
        where: { execution_price_id: executionPriceId },
        data: {
          is_voided: true,
          void_reason: "사용자 삭제",
          updated_by: updatedBy,
          updated_at: new Date(),
        },
      })
    }
  })

  revalidatePath("/equipments")
}
