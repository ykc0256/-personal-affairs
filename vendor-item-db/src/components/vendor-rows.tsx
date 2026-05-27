"use client"

import { Fragment, useActionState, useEffect, useState } from "react"
import { ChevronDown, ChevronRight, ClipboardPlus, Download, Save, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toggleVendorActive } from "@/app/(main)/vendors/actions"
import { createEvaluation, deleteEvaluation } from "@/app/(main)/vendors/evaluation-actions"
import { VendorManagementSheet } from "@/components/vendor-management-sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { TableCell, TableRow } from "@/components/ui/table"
import { formatCurrency, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export type CriteriaOption = {
  criteria_id: string
  criteria_name: string
  max_score: number
  weight: number | null
  description: string | null
}

export type VendorEvaluation = {
  evaluation_id: string
  evaluation_date: string
  grade: string | null
  total_score: number | null
  evaluator_name: string | null
  notes: string | null
  scores: { criteria_name: string; max_score: number; score: number }[]
}

export type VendorEquipmentItem = {
  vendor_item_id: string
  equipment_id: string
  equipment_code: string
  model_name: string | null
  category_name: string | null
  specification: string | null
  latest_design_price: number | null
  latest_design_price_date: string | null
  latest_execution_price: number | null
}

export type VendorRow = {
  vendor_id: string
  vendor_code: string
  vendor_name: string
  vendor_type: string | null
  country: string | null
  business_no: string | null
  financial_grade: string | null
  revenue_base_year: number | null
  is_active: boolean
  notes: string | null
  gwd_vendor_id: string | null
  equipment_count: number
  latest_evaluation: VendorEvaluation | null
  evaluations: VendorEvaluation[]
  items: VendorEquipmentItem[]
}

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`
}

export function VendorDownloadButton({ rows }: { rows: VendorRow[] }) {
  function handleDownload() {
    const headers = [
      "업체코드", "업체명", "유형", "국가", "사업자번호",
      "재무등급", "GWD ID", "취급기자재수", "최근평가등급", "최근평가점수", "최근평가일", "상태",
    ]
    const dataRows = rows.map((row) => [
      row.vendor_code,
      row.vendor_name,
      row.vendor_type ?? "",
      row.country ?? "",
      row.business_no ?? "",
      row.financial_grade ?? "",
      row.gwd_vendor_id ?? "",
      row.equipment_count,
      row.latest_evaluation?.grade ?? "",
      row.latest_evaluation?.total_score ?? "",
      row.latest_evaluation?.evaluation_date
        ? new Date(row.latest_evaluation.evaluation_date).toLocaleDateString("ko-KR")
        : "",
      row.is_active ? "활성" : "비활성",
    ])
    const csv = [headers, ...dataRows].map((r) => r.map(csvEscape).join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `업체목록_${new Date().toISOString().slice(0, 10)}.csv`
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

function GradeTag({ grade }: { grade: string | null }) {
  if (!grade) return <span className="text-muted-foreground">-</span>
  return <Badge variant="outline" className="text-xs">{grade}</Badge>
}

function EvaluationSheet({
  vendor,
  criteria,
  onClose,
}: {
  vendor: VendorRow
  criteria: CriteriaOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createEvaluation, { ok: false, message: "" })

  useEffect(() => {
    if (state.ok) {
      router.refresh()
      onClose()
    }
  }, [state.ok])

  const today = new Date().toISOString().split("T")[0]

  return (
    <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>업체 평가 등록</SheetTitle>
        <SheetDescription>{vendor.vendor_name} ({vendor.vendor_code})</SheetDescription>
      </SheetHeader>
      <form action={formAction} className="space-y-4 px-4 pb-4">
        <input type="hidden" name="vendorId" value={vendor.vendor_id} />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="evaluationDate">평가일</Label>
            <Input id="evaluationDate" name="evaluationDate" type="date" required defaultValue={today} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">
              등급
              <span className="ml-1 text-xs text-muted-foreground">선택</span>
            </Label>
            <Input id="grade" name="grade" maxLength={10} placeholder="예: A, B+, 우량" />
          </div>
        </div>

        {criteria.length > 0 && (
          <div className="space-y-2">
            <Label>항목별 점수</Label>
            <div className="rounded-md border divide-y">
              {criteria.map((c) => (
                <div key={c.criteria_id} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{c.criteria_name}</div>
                    {c.description && (
                      <div className="text-xs text-muted-foreground">{c.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input
                      name={`score_${c.criteria_id}`}
                      type="number"
                      min={0}
                      max={c.max_score}
                      step={0.5}
                      placeholder="0"
                      className="w-20 text-right"
                    />
                    <span className="text-xs text-muted-foreground w-12">/ {c.max_score}점</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">총점은 항목 점수의 합으로 자동 계산됩니다.</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="evalNotes">
            의견
            <span className="ml-1 text-xs text-muted-foreground">선택</span>
          </Label>
          <Input id="evalNotes" name="notes" placeholder="종합 의견이나 특이사항" />
        </div>

        {state.message && !state.ok && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          <Save size={14} />
          {pending ? "저장 중..." : "평가 등록"}
        </Button>
      </form>
    </SheetContent>
  )
}

function SectionHeader({
  open,
  onToggle,
  label,
  count,
  action,
}: {
  open: boolean
  onToggle: () => void
  label: string
  count: number
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
        onClick={onToggle}
      >
        {open
          ? <ChevronDown size={13} />
          : <ChevronRight size={13} />}
        {label} ({count})
      </button>
      {action}
    </div>
  )
}

function DeleteConfirm({ evaluationId, onCancel }: { evaluationId: string; onCancel: () => void }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(deleteEvaluation, { ok: false, message: "" })

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok])

  return (
    <form action={formAction} className="flex items-center gap-1 shrink-0">
      <input type="hidden" name="evaluationId" value={evaluationId} />
      <span className="text-xs text-destructive whitespace-nowrap">삭제?</span>
      <Button type="submit" variant="ghost" size="sm"
        className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/10" disabled={pending}>
        확인
      </Button>
      <Button type="button" variant="ghost" size="sm"
        className="h-6 px-1.5 text-xs" onClick={onCancel}>
        취소
      </Button>
    </form>
  )
}

function VendorExpandedPanel({
  vendor,
  canManage,
  canViewExecutionPrice,
  canEvaluate,
  onEvaluate,
}: {
  vendor: VendorRow
  canManage: boolean
  canViewExecutionPrice: boolean
  canEvaluate: boolean
  onEvaluate: () => void
}) {
  const [evalOpen, setEvalOpen] = useState(true)
  const [itemsOpen, setItemsOpen] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const infoFields: [string, string | number | null][] = [
    ["유형", vendor.vendor_type],
    ["국가", vendor.country],
    ["사업자번호", vendor.business_no],
    ["재무등급", vendor.financial_grade],
    ["매출 기준연도", vendor.revenue_base_year],
    ["GWD ID", vendor.gwd_vendor_id],
  ]

  return (
    <div className="border-y bg-gray-50 px-4 py-4 space-y-4">
      {/* Basic info */}
      {infoFields.some(([, v]) => v != null) || vendor.notes ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 text-sm">
          {infoFields.filter(([, v]) => v != null).map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
              <div className="font-medium">{String(value)}</div>
            </div>
          ))}
          {vendor.notes && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-0.5">비고</div>
              <div className="font-medium">{vendor.notes}</div>
            </div>
          )}
        </div>
      ) : null}

      {/* Evaluations */}
      <div className="rounded-md border bg-white overflow-hidden">
        <SectionHeader
          open={evalOpen}
          onToggle={() => setEvalOpen((v) => !v)}
          label="평가 이력"
          count={vendor.evaluations.length}
          action={canEvaluate ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={(e) => { e.stopPropagation(); onEvaluate() }}
            >
              <ClipboardPlus size={12} />
              평가 추가
            </Button>
          ) : undefined}
        />

        {evalOpen && (
          vendor.evaluations.length === 0 ? (
            <div className="px-3 py-2.5 text-xs text-muted-foreground">등록된 평가가 없습니다.</div>
          ) : (() => {
            // 모든 평가에 걸쳐 unique 항목명 수집 (순서 보존)
            const criteriaNames: string[] = []
            const seen = new Set<string>()
            for (const ev of vendor.evaluations) {
              for (const s of ev.scores) {
                if (!seen.has(s.criteria_name)) {
                  seen.add(s.criteria_name)
                  criteriaNames.push(s.criteria_name)
                }
              }
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50 text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">날짜</th>
                      <th className="px-3 py-2 text-left font-medium">등급</th>
                      <th className="px-3 py-2 text-right font-medium whitespace-nowrap">총점</th>
                      {criteriaNames.map((name) => (
                        <th key={name} className="px-3 py-2 text-right font-medium whitespace-nowrap">
                          {name}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">평가자</th>
                      <th className="px-3 py-2 text-left font-medium">의견</th>
                      {canEvaluate && <th className="w-8 px-2 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.evaluations.map((ev) => {
                      const scoreMap = new Map(ev.scores.map((s) => [s.criteria_name, s]))
                      return (
                        <tr key={ev.evaluation_id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted-foreground">
                            {formatDate(new Date(ev.evaluation_date))}
                          </td>
                          <td className="px-3 py-2">
                            <GradeTag grade={ev.grade} />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap">
                            {ev.total_score != null ? `${ev.total_score.toFixed(1)}점` : "-"}
                          </td>
                          {criteriaNames.map((name) => {
                            const s = scoreMap.get(name)
                            return (
                              <td key={name} className="px-3 py-2 text-right tabular-nums">
                                {s ? (
                                  <span>
                                    <span className="font-medium">{s.score}</span>
                                    <span className="text-muted-foreground">/{s.max_score}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                            {ev.evaluator_name ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">
                            {ev.notes ?? "-"}
                          </td>
                          {canEvaluate && (
                            <td className="px-2 py-2 text-right">
                              {confirmDeleteId === ev.evaluation_id ? (
                                <DeleteConfirm
                                  evaluationId={ev.evaluation_id}
                                  onCancel={() => setConfirmDeleteId(null)}
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                                  onClick={() => setConfirmDeleteId(ev.evaluation_id)}
                                  title="평가 삭제"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()
        )}
      </div>

      {/* Equipment items */}
      <div className="rounded-md border bg-white overflow-hidden">
        <SectionHeader
          open={itemsOpen}
          onToggle={() => setItemsOpen((v) => !v)}
          label="취급 기자재"
          count={vendor.items.length}
        />

        {itemsOpen && (
          vendor.items.length === 0 ? (
            <div className="px-3 py-3">
              <p className="text-xs text-muted-foreground">등록된 기자재가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[110px]">분류</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">기자재명</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-[180px]">규격/사양</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[130px]">설계가</th>
                    {canViewExecutionPrice && (
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground w-[110px]">실행가</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {vendor.items.map((item) => (
                    <tr key={item.vendor_item_id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{item.category_name ?? "-"}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.model_name ?? item.equipment_code}</div>
                        <div className="text-muted-foreground font-mono">{item.equipment_code}</div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground max-w-[180px] truncate">
                        {item.specification ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {item.latest_design_price != null ? (
                          <>
                            <div>{formatCurrency(item.latest_design_price)}</div>
                            {item.latest_design_price_date && (
                              <div className="text-muted-foreground">
                                {formatDate(new Date(item.latest_design_price_date))}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      {canViewExecutionPrice && (
                        <td className="px-3 py-2 text-right">
                          {item.latest_execution_price != null
                            ? formatCurrency(item.latest_execution_price)
                            : <span className="text-muted-foreground">-</span>}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function VendorRows({
  rows,
  canManage,
  canViewExecutionPrice,
  criteria = [],
  vendorTypes = [],
  countries = [],
}: {
  rows: VendorRow[]
  canManage: boolean
  canViewExecutionPrice: boolean
  criteria?: CriteriaOption[]
  vendorTypes?: string[]
  countries?: string[]
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [evalVendorId, setEvalVendorId] = useState<string | null>(null)

  const canEvaluate = canManage || canViewExecutionPrice
  const colCount = canManage ? 8 : 7

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      {rows.map((vendor) => {
        const isOpen = expanded.has(vendor.vendor_id)

        return (
          <Fragment key={vendor.vendor_id}>
            <TableRow
              className={cn(
                "cursor-pointer select-none transition-colors",
                !vendor.is_active && "opacity-50",
                isOpen && "bg-muted/30"
              )}
              onClick={() => toggle(vendor.vendor_id)}
            >
              <TableCell className="w-8 pr-0 pl-4">
                {isOpen
                  ? <ChevronDown size={14} className="text-muted-foreground" />
                  : <ChevronRight size={14} className="text-muted-foreground" />}
              </TableCell>
              <TableCell>
                <div className={cn("font-medium text-sm", !vendor.is_active && "line-through text-muted-foreground")}>
                  {vendor.vendor_name}
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{vendor.vendor_code}</div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{vendor.vendor_type ?? "-"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{vendor.country ?? "-"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{vendor.financial_grade ?? "-"}</TableCell>
              <TableCell className="text-sm text-center text-muted-foreground">
                {vendor.equipment_count > 0
                  ? <span className="font-medium text-foreground">{vendor.equipment_count}</span>
                  : "-"}
              </TableCell>
              <TableCell>
                {vendor.latest_evaluation ? (
                  <div className="flex items-center gap-1.5">
                    <GradeTag grade={vendor.latest_evaluation.grade} />
                    {vendor.latest_evaluation.total_score != null && (
                      <span className="text-xs text-muted-foreground">
                        {vendor.latest_evaluation.total_score.toFixed(1)}점
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              {canManage && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <VendorManagementSheet mode="edit" vendor={vendor} triggerLabel="수정" triggerVariant="ghost" vendorTypes={vendorTypes} countries={countries} />
                    <form action={toggleVendorActive}>
                      <input type="hidden" name="vendorId" value={vendor.vendor_id} />
                      <input type="hidden" name="isActive" value={String(vendor.is_active)} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 px-2 text-xs",
                          vendor.is_active
                            ? "text-muted-foreground hover:text-destructive"
                            : "text-blue-600 hover:text-blue-800"
                        )}
                      >
                        {vendor.is_active ? "비활성화" : "활성화"}
                      </Button>
                    </form>
                  </div>
                </TableCell>
              )}
            </TableRow>

            {isOpen && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount} className="p-0">
                  <VendorExpandedPanel
                    vendor={vendor}
                    canManage={canManage}
                    canViewExecutionPrice={canViewExecutionPrice}
                    canEvaluate={canEvaluate}
                    onEvaluate={() => setEvalVendorId(vendor.vendor_id)}
                  />
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        )
      })}

      <Sheet open={evalVendorId !== null} onOpenChange={(open) => { if (!open) setEvalVendorId(null) }}>
        {evalVendorId && (() => {
          const vendor = rows.find((r) => r.vendor_id === evalVendorId)
          if (!vendor) return null
          return (
            <EvaluationSheet
              key={evalVendorId}
              vendor={vendor}
              criteria={criteria}
              onClose={() => setEvalVendorId(null)}
            />
          )
        })()}
      </Sheet>
    </>
  )
}
