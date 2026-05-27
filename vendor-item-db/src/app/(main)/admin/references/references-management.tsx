"use client"

import { useActionState, useState } from "react"
import { Pencil, Plus, Save, Trash2 } from "lucide-react"
import {
  createVendorType, updateVendorType, toggleVendorTypeActive, deleteVendorType,
  createCountry, updateCountry, toggleCountryActive, deleteCountry,
  seedDefaults,
} from "./actions"
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
import { cn } from "@/lib/utils"

export type RefRow = { id: string; name: string; sort_order: number; is_active: boolean }
type ActionState = { ok: boolean; message: string }
type SheetMode = { type: "create" } | { type: "edit"; row: RefRow }

// ── 인라인 삭제 확인 ──────────────────────────────────────────────────────────

function DeleteConfirm({
  idField,
  id,
  action,
  onCancel,
}: {
  idField: string
  id: string
  action: (fd: FormData) => Promise<void>
  onCancel: () => void
}) {
  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name={idField} value={id} />
      <span className="text-xs text-destructive whitespace-nowrap">삭제?</span>
      <Button type="submit" variant="ghost" size="sm"
        className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/10">
        확인
      </Button>
      <Button type="button" variant="ghost" size="sm"
        className="h-6 px-1.5 text-xs" onClick={onCancel}>
        취소
      </Button>
    </form>
  )
}

// ── 공통 패널 테이블 ──────────────────────────────────────────────────────────

function RefTableRows({
  rows,
  showInactive,
  idField,
  confirmDeleteId,
  onEdit,
  onConfirmDelete,
  onCancelDelete,
  toggleAction,
  deleteAction,
}: {
  rows: RefRow[]
  showInactive: boolean
  idField: string
  confirmDeleteId: string | null
  onEdit: (row: RefRow) => void
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  toggleAction: (fd: FormData) => Promise<void>
  deleteAction: (fd: FormData) => Promise<void>
}) {
  const visible = showInactive ? rows : rows.filter((r) => r.is_active)

  if (visible.length === 0) {
    return (
      <tr>
        <td colSpan={4} className="h-16 text-center text-sm text-muted-foreground">
          등록된 항목이 없습니다.
        </td>
      </tr>
    )
  }

  return (
    <>
      {visible.map((row) => (
        <tr key={row.id} className={cn("border-b last:border-0", !row.is_active && "opacity-50")}>
          <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">{row.sort_order}</td>
          <td className="px-4 py-2.5">
            <span className={cn("font-medium", !row.is_active && "line-through text-muted-foreground")}>
              {row.name}
            </span>
          </td>
          <td className="px-4 py-2.5 text-center">
            {row.is_active
              ? <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">활성</Badge>
              : <Badge variant="outline" className="text-xs text-muted-foreground">비활성</Badge>}
          </td>
          <td className="px-4 py-2.5">
            <div className="flex items-center justify-end gap-1">
              {/* 비활성 시 삭제 */}
              {!row.is_active && (
                confirmDeleteId === row.id ? (
                  <DeleteConfirm
                    idField={idField}
                    id={row.id}
                    action={deleteAction}
                    onCancel={onCancelDelete}
                  />
                ) : (
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => onConfirmDelete(row.id)}
                    title="삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                )
              )}

              {/* 수정 (활성 시만) */}
              {row.is_active && (
                <Button
                  type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs"
                  onClick={() => onEdit(row)}
                >
                  <Pencil size={12} />수정
                </Button>
              )}

              {/* 활성화/비활성화 토글 */}
              <form action={toggleAction}>
                <input type="hidden" name={idField} value={row.id} />
                <input type="hidden" name="isActive" value={String(row.is_active)} />
                <Button type="submit" variant="ghost" size="sm"
                  className={cn("h-7 px-2 text-xs",
                    row.is_active
                      ? "text-muted-foreground hover:text-destructive"
                      : "text-blue-600 hover:text-blue-800")}>
                  {row.is_active ? "비활성화" : "활성화"}
                </Button>
              </form>
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}

// ── 업체 유형 폼 시트 ─────────────────────────────────────────────────────────

function VendorTypeFormSheet({ mode, onSuccess }: { mode: SheetMode; onSuccess: () => void }) {
  const action = mode.type === "edit" ? updateVendorType : createVendorType
  const [state, formAction, pending] = useActionState(action, { ok: false, message: "" })
  const editRow = mode.type === "edit" ? mode.row : null

  if (state.ok) onSuccess()

  return (
    <SheetContent className="w-full sm:max-w-sm">
      <SheetHeader>
        <SheetTitle>{mode.type === "edit" ? "업체 유형 수정" : "업체 유형 추가"}</SheetTitle>
        <SheetDescription>업체 유형 항목을 입력합니다.</SheetDescription>
      </SheetHeader>
      <form action={formAction} className="space-y-4 px-4 pb-4">
        {editRow && <input type="hidden" name="typeId" value={editRow.id} />}
        <div className="space-y-2">
          <Label htmlFor="typeName">유형명</Label>
          <Input id="typeName" name="typeName" required maxLength={100}
            defaultValue={editRow?.name ?? ""} placeholder="예: 제조사, 대리점, 시공사" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vt-sortOrder">
            정렬 순서 <span className="ml-1 text-xs text-muted-foreground">선택</span>
          </Label>
          <Input id="vt-sortOrder" name="sortOrder" type="number" min={0}
            defaultValue={editRow?.sort_order ?? ""} placeholder="비워두면 자동" />
        </div>
        {state.message && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          <Save size={14} />{pending ? "저장 중..." : "저장"}
        </Button>
      </form>
    </SheetContent>
  )
}

// ── 국가 폼 시트 ──────────────────────────────────────────────────────────────

function CountryFormSheet({ mode, onSuccess }: { mode: SheetMode; onSuccess: () => void }) {
  const action = mode.type === "edit" ? updateCountry : createCountry
  const [state, formAction, pending] = useActionState(action, { ok: false, message: "" })
  const editRow = mode.type === "edit" ? mode.row : null

  if (state.ok) onSuccess()

  return (
    <SheetContent className="w-full sm:max-w-sm">
      <SheetHeader>
        <SheetTitle>{mode.type === "edit" ? "국가 수정" : "국가 추가"}</SheetTitle>
        <SheetDescription>국가 항목을 입력합니다.</SheetDescription>
      </SheetHeader>
      <form action={formAction} className="space-y-4 px-4 pb-4">
        {editRow && <input type="hidden" name="countryId" value={editRow.id} />}
        <div className="space-y-2">
          <Label htmlFor="countryName">국가명</Label>
          <Input id="countryName" name="countryName" required maxLength={100}
            defaultValue={editRow?.name ?? ""} placeholder="예: 대한민국, 독일, 미국" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="c-sortOrder">
            정렬 순서 <span className="ml-1 text-xs text-muted-foreground">선택</span>
          </Label>
          <Input id="c-sortOrder" name="sortOrder" type="number" min={0}
            defaultValue={editRow?.sort_order ?? ""} placeholder="비워두면 자동" />
        </div>
        {state.message && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          <Save size={14} />{pending ? "저장 중..." : "저장"}
        </Button>
      </form>
    </SheetContent>
  )
}

// ── 업체 유형 패널 ────────────────────────────────────────────────────────────

export function VendorTypesPanel({ rows }: { rows: RefRow[] }) {
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)
  const [showInactive, setShowInactive] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const activeCount = rows.filter((r) => r.is_active).length
  const inactiveCount = rows.length - activeCount

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">업체 유형</h2>
          <p className="text-sm text-muted-foreground">총 {rows.length}개 · 활성 {activeCount}개</p>
        </div>
        <div className="flex items-center gap-2">
          {inactiveCount > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
              onClick={() => setShowInactive((v) => !v)}>
              {showInactive ? `비활성 숨기기 (${inactiveCount})` : `비활성 보기 (${inactiveCount})`}
            </Button>
          )}
          <Button size="sm" onClick={() => setSheetMode({ type: "create" })}>
            <Plus size={14} />추가
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-100 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium w-[60px]">순서</th>
              <th className="px-4 py-2.5 text-left font-medium">이름</th>
              <th className="px-4 py-2.5 text-center font-medium w-[70px]">상태</th>
              <th className="px-4 py-2.5 text-right font-medium w-[200px]">액션</th>
            </tr>
          </thead>
          <tbody>
            <RefTableRows
              rows={rows}
              showInactive={showInactive}
              idField="typeId"
              confirmDeleteId={confirmDeleteId}
              onEdit={(row) => setSheetMode({ type: "edit", row })}
              onConfirmDelete={(id) => setConfirmDeleteId(id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              toggleAction={toggleVendorTypeActive}
              deleteAction={deleteVendorType}
            />
          </tbody>
        </table>
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(open) => { if (!open) setSheetMode(null) }}>
        {sheetMode && (
          <VendorTypeFormSheet
            key={sheetMode.type === "edit" ? sheetMode.row.id : "create"}
            mode={sheetMode}
            onSuccess={() => setSheetMode(null)}
          />
        )}
      </Sheet>
    </div>
  )
}

// ── 국가 패널 ─────────────────────────────────────────────────────────────────

export function CountriesPanel({ rows }: { rows: RefRow[] }) {
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)
  const [showInactive, setShowInactive] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const activeCount = rows.filter((r) => r.is_active).length
  const inactiveCount = rows.length - activeCount

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">국가</h2>
          <p className="text-sm text-muted-foreground">총 {rows.length}개 · 활성 {activeCount}개</p>
        </div>
        <div className="flex items-center gap-2">
          {inactiveCount > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
              onClick={() => setShowInactive((v) => !v)}>
              {showInactive ? `비활성 숨기기 (${inactiveCount})` : `비활성 보기 (${inactiveCount})`}
            </Button>
          )}
          <Button size="sm" onClick={() => setSheetMode({ type: "create" })}>
            <Plus size={14} />추가
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-100 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium w-[60px]">순서</th>
              <th className="px-4 py-2.5 text-left font-medium">이름</th>
              <th className="px-4 py-2.5 text-center font-medium w-[70px]">상태</th>
              <th className="px-4 py-2.5 text-right font-medium w-[200px]">액션</th>
            </tr>
          </thead>
          <tbody>
            <RefTableRows
              rows={rows}
              showInactive={showInactive}
              idField="countryId"
              confirmDeleteId={confirmDeleteId}
              onEdit={(row) => setSheetMode({ type: "edit", row })}
              onConfirmDelete={(id) => setConfirmDeleteId(id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              toggleAction={toggleCountryActive}
              deleteAction={deleteCountry}
            />
          </tbody>
        </table>
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(open) => { if (!open) setSheetMode(null) }}>
        {sheetMode && (
          <CountryFormSheet
            key={sheetMode.type === "edit" ? sheetMode.row.id : "create"}
            mode={sheetMode}
            onSuccess={() => setSheetMode(null)}
          />
        )}
      </Sheet>
    </div>
  )
}

// ── 기본값 배너 ──────────────────────────────────────────────────────────────

function SeedBanner() {
  const [state, formAction, pending] = useActionState(seedDefaults, { ok: false, message: "" })

  if (state.ok) return null

  return (
    <div className="rounded-md border border-dashed bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        업체 유형과 국가가 비어 있습니다. 기본값을 한 번에 설정할 수 있습니다.
      </p>
      <form action={formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "설정 중..." : "기본값 설정"}
        </Button>
      </form>
    </div>
  )
}

// ── 메인 export ──────────────────────────────────────────────────────────────

export function ReferencesManagementPanel({
  vendorTypes,
  countries,
  isEmpty,
}: {
  vendorTypes: RefRow[]
  countries: RefRow[]
  isEmpty: boolean
}) {
  return (
    <div className="space-y-8">
      {isEmpty && <SeedBanner />}
      <VendorTypesPanel rows={vendorTypes} />
      <CountriesPanel rows={countries} />
    </div>
  )
}
