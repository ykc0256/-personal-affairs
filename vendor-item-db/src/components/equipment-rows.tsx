"use client"

import { Fragment, useActionState, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, Download, History, PencilLine, Trash2, X } from "lucide-react"
import {
  activateEquipment,
  addEquipmentPrice,
  bulkDeactivateEquipments,
  deactivateEquipment,
  deleteEquipment,
  deleteVoidedPrice,
  voidPriceHistory,
} from "@/app/(main)/equipments/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EquipmentManagementSheet } from "@/components/equipment-management-sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { TableCell, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export type EquipmentRow = {
  equipment: {
    equipment_id: string
    category_id: string | null
    equipment_code: string
    model_name: string | null
    manufacturer_model_no: string | null
    specification: string | null
    unit: string | null
    gwd_equipment_id: string | null
    is_active: boolean
    notes: string | null
  }
  category: string
  representativeVendor: string | null
  representativeCountry: string | null
  designPrice: number | null
  designCurrency: string | null
  executionPrice: number | null
  executionCurrency: string | null
  grade: string | null
  score: number | null
  vendorItems: Array<{
    vendorItemId: string
    vendorId: string
    vendorName: string
    vendorCode: string
    country: string | null
    dealerName: string | null
    grade: string | null
    score: number | null
    designPrice: number | null
    designCurrency: string | null
    designPriceDate: string | null
    executionPrice: number | null
    executionCurrency: string | null
    executionPriceDate: string | null
    designPriceHistory: PriceHistory[]
    executionPriceHistory: PriceHistory[]
  }>
}

type VendorOption = {
  vendor_id: string
  vendor_code: string
  vendor_name: string
}

type CategoryOption = {
  category_id: string
  category_code: string
  category_name: string
  depth: number
}

type PriceHistory = {
  id: string
  type: "설계가" | "실행가"
  vendorId: string
  vendorName: string
  vendorCode: string
  amount: number
  currency: string
  priceDate: string
  source: string | null
  note: string | null
  isVoided: boolean
}

type CombinedPriceHistory = {
  key: string
  monthKey: string
  monthLabel: string
  priceDate: string
  vendorId: string
  vendorName: string
  vendorCode: string
  status: "최신" | "이전" | "확정 제외"
  designPriceId: string | null
  executionPriceId: string | null
  designAmount: number | null
  designSource: string | null
  designCurrency: string | null
  executionAmount: number | null
  executionSource: string | null
  executionCurrency: string | null
  note: string | null
}

function todayInputValue() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function EquipmentDownloadButton({
  rows,
  canViewExecutionPrice,
}: {
  rows: EquipmentRow[]
  canViewExecutionPrice: boolean
}) {
  function handleDownload() {
    const headers = [
      "분류", "모델명", "기자재코드", "제조사모델번호", "규격/사양",
      "설계가", "통화", ...(canViewExecutionPrice ? ["실행가"] : []),
      "업체", "국가", "평가등급", "평가점수",
    ]
    const dataRows = rows.map((row) => [
      row.category,
      row.equipment.model_name ?? row.equipment.equipment_code,
      row.equipment.equipment_code,
      row.equipment.manufacturer_model_no ?? "",
      row.equipment.specification ?? "",
      row.designPrice ?? "",
      row.designCurrency ?? "KRW",
      ...(canViewExecutionPrice ? [row.executionPrice ?? ""] : []),
      row.representativeVendor ?? "",
      row.representativeCountry ?? "",
      row.grade ?? "",
      row.score ?? "",
    ])
    const csv = [headers, ...dataRows].map((r) => r.map(csvEscape).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `기자재목록_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} title="CSV 다운로드">
      <Download size={14} />
      내보내기
    </Button>
  )
}

export function EquipmentRows({
  rows,
  vendors,
  categories,
  canManageEquipment,
  canManagePrices,
  canViewExecutionPrice,
}: {
  rows: EquipmentRow[]
  vendors: VendorOption[]
  categories: CategoryOption[]
  canManageEquipment: boolean
  canManagePrices: boolean
  canViewExecutionPrice: boolean
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkState, bulkAction, bulkPending] = useActionState(bulkDeactivateEquipments, {
    ok: false,
    message: "",
  })

  useEffect(() => {
    if (bulkState.ok) setSelectedIds(new Set())
  }, [bulkState])

  const checkboxColCount = canManageEquipment ? 1 : 0
  const columnCount = (canViewExecutionPrice ? 8 : 7) + checkboxColCount

  const allActiveIds = rows.filter((r) => r.equipment.is_active).map((r) => r.equipment.equipment_id)
  const allSelected = allActiveIds.length > 0 && allActiveIds.every((id) => selectedIds.has(id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allActiveIds))
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <TableRow>
          <TableCell colSpan={columnCount} className="border-b bg-blue-50 px-4 py-2">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium text-blue-700">{selectedIds.size}개 선택됨</span>
              <form action={bulkAction}>
                <input type="hidden" name="equipmentIds" value={[...selectedIds].join(",")} />
                <Button type="submit" size="sm" variant="outline" disabled={bulkPending}>
                  {bulkPending ? "처리 중..." : "비활성화"}
                </Button>
              </form>
              <button
                type="button"
                className="text-sm text-muted-foreground underline-offset-2 hover:underline"
                onClick={() => setSelectedIds(new Set())}
              >
                선택 해제
              </button>
              {bulkState.message && !bulkState.ok && (
                <span className="text-sm text-destructive">{bulkState.message}</span>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
      {rows.map((row) => {
        const isExpanded = expandedId === row.equipment.equipment_id
        const isSelected = selectedIds.has(row.equipment.equipment_id)

        return (
          <Fragment key={row.equipment.equipment_id}>
            <TableRow
              aria-expanded={isExpanded}
              className={cn(
                "cursor-pointer",
                !row.equipment.is_active && "opacity-50",
                isSelected && "bg-blue-50/60"
              )}
              onClick={() => setExpandedId(isExpanded ? null : row.equipment.equipment_id)}
            >
              {canManageEquipment && (
                <TableCell
                  className="w-[40px] pr-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRow(row.equipment.equipment_id)}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300"
                    aria-label={`${row.equipment.model_name ?? row.equipment.equipment_code} 선택`}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
              )}
              <TableCell className="text-muted-foreground">
                <div className="truncate">{row.category}</div>
              </TableCell>
              <TableCell>
                <div className="inline-flex max-w-full items-center gap-1.5 font-medium">
                  {isExpanded ? <ChevronUp size={15} className="shrink-0" /> : <ChevronDown size={15} className="shrink-0" />}
                  <span className="truncate">
                    {row.equipment.model_name ?? row.equipment.equipment_code}
                  </span>
                  {!row.equipment.is_active && (
                    <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">비활성</Badge>
                  )}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {row.equipment.manufacturer_model_no ?? row.equipment.equipment_code}
                </div>
              </TableCell>
              <TableCell className="whitespace-normal text-muted-foreground">
                <div className="line-clamp-2">{row.equipment.specification ?? "-"}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="truncate">{formatCurrency(row.designPrice, row.designCurrency ?? "KRW")}</div>
              </TableCell>
              {canViewExecutionPrice && (
                <TableCell className="text-right">
                  <div className="truncate">{formatCurrency(row.executionPrice, row.executionCurrency ?? "KRW")}</div>
                </TableCell>
              )}
              <TableCell>
                <div className="truncate">{row.representativeVendor ?? "-"}</div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <div className="truncate">{row.representativeCountry ?? "-"}</div>
              </TableCell>
              <TableCell>
                {row.grade || row.score != null ? (
                  <div className="flex flex-col gap-0.5">
                    {row.grade && <Badge variant="outline" className="w-fit text-xs">{row.grade}</Badge>}
                    {row.score != null && (
                      <span className="text-xs text-muted-foreground">{row.score.toFixed(1)}점</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
            {isExpanded && (
              <TableRow className="bg-transparent hover:bg-transparent">
                <TableCell colSpan={columnCount} className="max-w-0 p-0">
                  <EquipmentExpandedPanel
                    row={row}
                    vendors={vendors}
                    categories={categories}
                    canManageEquipment={canManageEquipment}
                    canManagePrices={canManagePrices}
                    canViewExecutionPrice={canViewExecutionPrice}
                    onClose={() => setExpandedId(null)}
                  />
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        )
      })}
      {canManageEquipment && rows.length > 0 && (
        <TableRow>
          <TableCell colSpan={columnCount} className="border-t px-4 py-2">
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={toggleSelectAll}
            >
              {allSelected ? "전체 선택 해제" : `전체 선택 (${allActiveIds.length}개)`}
            </button>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function EquipmentExpandedPanel({
  row,
  vendors,
  categories,
  canManageEquipment,
  canManagePrices,
  canViewExecutionPrice,
  onClose,
}: {
  row: EquipmentRow
  vendors: VendorOption[]
  categories: CategoryOption[]
  canManageEquipment: boolean
  canManagePrices: boolean
  canViewExecutionPrice: boolean
  onClose: () => void
}) {
  const histories = useMemo(() => combineHistories(row.vendorItems), [row.vendorItems])
  const fixedVendorItem = row.vendorItems[0] ?? null
  const priceManagementEnabled = canManagePrices && (fixedVendorItem !== null || vendors.length > 0)
  const actionColumnCount = canManagePrices ? 1 : 0
  const visibleColumnCount = (canViewExecutionPrice ? 8 : 6) + actionColumnCount

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteEquipment, {
    ok: false,
    message: "",
  })

  return (
    <div className="max-w-full overflow-hidden border-y bg-gray-50 px-4 py-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">
            {row.equipment.model_name ?? row.equipment.equipment_code}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>기자재 코드: {row.equipment.equipment_code}</span>
            <span>GWD ID: {row.equipment.gwd_equipment_id ?? "-"}</span>
            <span>상태: {row.equipment.is_active ? "활성" : "비활성"}</span>
            <span>업체: {fixedVendorItem?.vendorName ?? "미지정"}</span>
          </div>
          {deleteState.message && !deleteState.ok && (
            <p className="mt-2 text-xs text-destructive">{deleteState.message}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          {canManageEquipment && (
            <>
              <EquipmentManagementSheet
                mode="edit"
                categories={categories}
                equipment={row.equipment}
                triggerLabel="수정"
                triggerVariant="outline"
              />
              {row.equipment.is_active ? (
                <form
                  action={deactivateEquipment}
                  onSubmit={(e) => {
                    if (!window.confirm(`"${row.equipment.model_name ?? row.equipment.equipment_code}"을(를) 비활성화하시겠습니까?`)) {
                      e.preventDefault()
                    }
                  }}
                >
                  <input type="hidden" name="equipmentId" value={row.equipment.equipment_id} />
                  <Button type="submit" variant="outline" size="sm">
                    비활성화
                  </Button>
                </form>
              ) : (
                <form action={activateEquipment}>
                  <input type="hidden" name="equipmentId" value={row.equipment.equipment_id} />
                  <Button type="submit" variant="outline" size="sm">
                    활성화
                  </Button>
                </form>
              )}
              {confirmingDelete ? (
                <>
                  <span className="flex items-center text-sm text-destructive">삭제?</span>
                  <form action={deleteAction}>
                    <input type="hidden" name="equipmentId" value={row.equipment.equipment_id} />
                    <Button
                      type="submit"
                      variant="destructive"
                      size="sm"
                      disabled={deletePending}
                    >
                      {deletePending ? "삭제 중..." : "확인"}
                    </Button>
                  </form>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    취소
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmingDelete(true)}
                  title="기자재 영구 삭제"
                >
                  <Trash2 size={14} />
                  삭제
                </Button>
              )}
            </>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X size={14} />
            닫기
          </Button>
        </div>
      </div>

      <section className="rounded-md border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div className="inline-flex items-center gap-1.5 text-sm font-medium">
            <History size={15} />
            가격 변경 이력
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{histories.length}건</Badge>
            {canManagePrices && (
              <PriceCreateSheet
                row={row}
                vendors={vendors}
                fixedVendorItem={fixedVendorItem}
                disabled={!priceManagementEnabled}
                canViewExecutionPrice={canViewExecutionPrice}
              />
            )}
          </div>
        </div>
        <div className="max-w-full overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed text-xs">
            <colgroup>
              <col className="w-[94px]" />
              <col className="w-[76px]" />
              <col className="w-[140px]" />
              <col className="w-[112px]" />
              <col className="w-[112px]" />
              {canViewExecutionPrice && <col className="w-[112px]" />}
              {canViewExecutionPrice && <col className="w-[112px]" />}
              <col className="w-[104px]" />
              {canManagePrices && <col className="w-[64px]" />}
            </colgroup>
            <thead className="border-b bg-gray-50 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">기준일</th>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-left font-medium">업체</th>
                <th className="px-3 py-2 text-right font-medium">설계가 금액</th>
                <th className="px-3 py-2 text-left font-medium">설계가 출처</th>
                {canViewExecutionPrice && (
                  <th className="px-3 py-2 text-right font-medium">실행가</th>
                )}
                {canViewExecutionPrice && (
                  <th className="px-3 py-2 text-left font-medium">실행가 출처</th>
                )}
                <th className="px-3 py-2 text-left font-medium">비고</th>
                {canManagePrices && (
                  <th className="px-3 py-2 text-center font-medium">삭제</th>
                )}
              </tr>
            </thead>
            <tbody>
              {histories.map((history, index) => {
                const previous = histories[index - 1]
                const showMonth = !previous || previous.monthKey !== history.monthKey

                return (
                  <Fragment key={history.key}>
                    {showMonth && (
                      <tr className="border-b bg-slate-50">
                        <td
                          colSpan={visibleColumnCount}
                          className="px-3 py-2 text-xs font-medium text-slate-600"
                        >
                          {history.monthLabel}
                        </td>
                      </tr>
                    )}
                    <tr
                      className={cn(
                        "border-b last:border-0",
                        history.status === "확정 제외" &&
                          "bg-gray-50 text-muted-foreground"
                      )}
                    >
                      <td className="px-3 py-2">{formatDate(history.priceDate)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={history.status} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate font-medium">{history.vendorName}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {history.vendorCode}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(history.designAmount, history.designCurrency ?? "KRW")}
                      </td>
                      <td className="px-3 py-2">
                        <div className="truncate">{history.designSource ?? "-"}</div>
                      </td>
                      {canViewExecutionPrice && (
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(history.executionAmount, history.executionCurrency ?? "KRW")}
                        </td>
                      )}
                      {canViewExecutionPrice && (
                        <td className="px-3 py-2">
                          <div className="truncate">{history.executionSource ?? "-"}</div>
                        </td>
                      )}
                      <td className="px-3 py-2">
                        <div className="truncate">{history.note || "-"}</div>
                      </td>
                      {canManagePrices && (
                        <td className="px-3 py-2 text-center">
                          {history.status === "확정 제외" ? (
                            <form action={deleteVoidedPrice}>
                              <input
                                type="hidden"
                                name="designPriceId"
                                value={history.designPriceId ?? ""}
                              />
                              <input
                                type="hidden"
                                name="executionPriceId"
                                value={history.executionPriceId ?? ""}
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon-sm"
                                title="이력 영구 삭제"
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </form>
                          ) : (
                            <form action={voidPriceHistory}>
                              <input
                                type="hidden"
                                name="designPriceId"
                                value={history.designPriceId ?? ""}
                              />
                              <input
                                type="hidden"
                                name="executionPriceId"
                                value={history.executionPriceId ?? ""}
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon-sm"
                                title="가격 이력 삭제"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </form>
                          )}
                        </td>
                      )}
                    </tr>
                  </Fragment>
                )
              })}
              {histories.length === 0 && (
                <tr>
                  <td
                    colSpan={visibleColumnCount}
                    className="h-20 px-3 py-2 text-center text-muted-foreground"
                  >
                    가격 이력이 없습니다. 가격 관리에서 신규 가격을 추가하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: CombinedPriceHistory["status"] }) {
  if (status === "확정 제외") {
    return <Badge variant="destructive">확정 제외</Badge>
  }

  if (status === "최신") {
    return <Badge>최신</Badge>
  }

  return <Badge variant="outline">이전</Badge>
}

function PriceCreateSheet({
  row,
  vendors,
  fixedVendorItem,
  disabled,
  canViewExecutionPrice,
}: {
  row: EquipmentRow
  vendors: VendorOption[]
  fixedVendorItem: EquipmentRow["vendorItems"][number] | null
  disabled: boolean
  canViewExecutionPrice: boolean
}) {
  const [state, formAction, pending] = useActionState(addEquipmentPrice, {
    ok: false,
    message: "",
  })

  return (
    <Sheet>
      <SheetTrigger
        disabled={disabled}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <PencilLine size={14} />
        가격 관리
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>가격 신규 추가</SheetTitle>
          <SheetDescription>
            저장하면 가격 변경 이력에 새 항목이 추가됩니다.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="space-y-4 px-4 pb-4">
          <input
            type="hidden"
            name="equipmentId"
            value={row.equipment.equipment_id}
          />
          <input
            type="hidden"
            name="vendorItemId"
            value={fixedVendorItem?.vendorItemId ?? ""}
          />

          {fixedVendorItem ? (
            <div className="space-y-2">
              <Label>고정 업체</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <div className="font-medium">{fixedVendorItem.vendorName}</div>
                <div className="text-xs text-muted-foreground">
                  {fixedVendorItem.vendorCode}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`vendor-${row.equipment.equipment_id}`}>업체 지정</Label>
              <select
                id={`vendor-${row.equipment.equipment_id}`}
                name="vendorId"
                required
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">업체 선택</option>
                {vendors.map((vendor) => (
                  <option key={vendor.vendor_id} value={vendor.vendor_id}>
                    {vendor.vendor_name} ({vendor.vendor_code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                이 기자재에 고정 업체가 없어 최초 입력 시 업체 연결 항목을 생성합니다.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`price-date-${row.equipment.equipment_id}`}>기준일</Label>
              <Input
                id={`price-date-${row.equipment.equipment_id}`}
                name="priceDate"
                type="date"
                required
                defaultValue={todayInputValue()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`currency-${row.equipment.equipment_id}`}>통화</Label>
              <select
                id={`currency-${row.equipment.equipment_id}`}
                name="currency"
                defaultValue="KRW"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="KRW">KRW (원)</option>
                <option value="USD">USD (달러)</option>
                <option value="EUR">EUR (유로)</option>
                <option value="JPY">JPY (엔)</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`design-price-${row.equipment.equipment_id}`}>
                설계가 금액
              </Label>
              <Input
                id={`design-price-${row.equipment.equipment_id}`}
                name="designPrice"
                inputMode="decimal"
                placeholder="예: 1200000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`design-source-${row.equipment.equipment_id}`}>
                설계가 출처
              </Label>
              <Input
                id={`design-source-${row.equipment.equipment_id}`}
                name="designSource"
                placeholder="견적서, 메일 등"
              />
            </div>
          </div>

          {canViewExecutionPrice && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`execution-price-${row.equipment.equipment_id}`}>
                  실행가
                </Label>
                <Input
                  id={`execution-price-${row.equipment.equipment_id}`}
                  name="executionPrice"
                  inputMode="decimal"
                  placeholder="예: 1100000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`execution-source-${row.equipment.equipment_id}`}>
                  실행가 출처
                </Label>
                <Input
                  id={`execution-source-${row.equipment.equipment_id}`}
                  name="executionSource"
                  placeholder="계약서, 내부 산출 등"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`note-${row.equipment.equipment_id}`}>비고</Label>
            <Input
              id={`note-${row.equipment.equipment_id}`}
              name="note"
              placeholder="가격 변경 사유, 확인 내용 등"
            />
          </div>

          {state.message && (
            <p
              className={cn(
                "text-sm",
                state.ok ? "text-green-700" : "text-destructive"
              )}
            >
              {state.message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending || disabled}>
            {pending ? "저장 중..." : "저장"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function combineHistories(vendorItems: EquipmentRow["vendorItems"]) {
  const latestByVendorAndType = new Map<string, string>()

  for (const item of vendorItems) {
    for (const type of ["설계가", "실행가"] as const) {
      const histories =
        type === "설계가" ? item.designPriceHistory : item.executionPriceHistory
      const latest = [...histories]
        .filter((history) => !history.isVoided)
        .sort(
          (a, b) =>
            new Date(b.priceDate).getTime() - new Date(a.priceDate).getTime()
        )[0]

      if (latest) latestByVendorAndType.set(`${item.vendorId}:${type}`, latest.id)
    }
  }

  // Key includes isVoided so same-date void+active entries stay as separate rows
  const byKey = new Map<string, CombinedPriceHistory>()

  for (const item of vendorItems) {
    for (const history of [
      ...item.designPriceHistory,
      ...item.executionPriceHistory,
    ]) {
      const dateStr = history.priceDate.slice(0, 10)
      const key = `${history.vendorId}:${dateStr}:${history.isVoided}`
      const date = new Date(history.priceDate)
      const monthKey = history.priceDate.slice(0, 7)
      const current =
        byKey.get(key) ??
        ({
          key,
          monthKey,
          monthLabel: date.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
          }),
          priceDate: history.priceDate,
          vendorId: history.vendorId,
          vendorName: history.vendorName,
          vendorCode: history.vendorCode,
          status: history.isVoided ? "확정 제외" : "이전",
          designPriceId: null,
          executionPriceId: null,
          designAmount: null,
          designSource: null,
          designCurrency: null,
          executionAmount: null,
          executionSource: null,
          executionCurrency: null,
          note: null,
        } satisfies CombinedPriceHistory)

      if (history.type === "설계가") {
        current.designPriceId = history.id
        current.designAmount = history.amount
        current.designSource = history.source
        current.designCurrency = history.currency
        current.note = history.note ?? current.note
      } else {
        current.executionPriceId = history.id
        current.executionAmount = history.amount
        current.executionSource = history.source
        current.executionCurrency = history.currency
        current.note = history.note ?? current.note
      }

      if (!history.isVoided) {
        const latestId = latestByVendorAndType.get(`${history.vendorId}:${history.type}`)
        if (latestId === history.id) {
          current.status = "최신"
        }
      }

      const currencyNotes = [
        current.designCurrency && current.designCurrency !== "KRW"
          ? `설계가 ${current.designCurrency}`
          : null,
        current.executionCurrency && current.executionCurrency !== "KRW"
          ? `실행가 ${current.executionCurrency}`
          : null,
      ].filter(Boolean)
      current.note = [current.note, ...currencyNotes].filter(Boolean).join(" / ") || null

      byKey.set(key, current)
    }
  }

  return [...byKey.values()].sort((a, b) => {
    const dateDiff =
      new Date(b.priceDate).getTime() - new Date(a.priceDate).getTime()
    if (dateDiff !== 0) return dateDiff
    // Within same date: active entries before voided ones
    if (a.status !== "확정 제외" && b.status === "확정 제외") return -1
    if (a.status === "확정 제외" && b.status !== "확정 제외") return 1
    return a.vendorName.localeCompare(b.vendorName, "ko-KR")
  })
}
