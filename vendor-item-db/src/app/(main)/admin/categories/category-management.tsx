"use client"

import { useActionState, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, EyeOff, FileUp, FolderPlus, Pencil, Plus, Save, Trash2 } from "lucide-react"
import { createCategory, deleteCategory, toggleCategoryActive, updateCategory } from "./actions"
import { CategoryUploadPanel } from "./category-upload"
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

export type CategoryRow = {
  category_id: string
  parent_category_id: string | null
  category_code: string
  category_name: string
  depth: number
  sort_order: number
  is_active: boolean
  equipment_count: number
}

type SheetMode =
  | { type: "create-root" }
  | { type: "create-child"; parent: CategoryRow }
  | { type: "edit"; category: CategoryRow }

function sheetKey(mode: SheetMode | null) {
  if (!mode) return "closed"
  if (mode.type === "create-root") return "create-root"
  if (mode.type === "create-child") return `create-child-${mode.parent.category_id}`
  return `edit-${mode.category.category_id}`
}

const DEPTH_STYLES: Record<number, { row: string; indent: string }> = {
  1: { row: "bg-white",      indent: "" },
  2: { row: "bg-slate-50",   indent: "border-l-2 border-slate-200 ml-2" },
  3: { row: "bg-sky-50",     indent: "border-l-2 border-sky-200 ml-4" },
  4: { row: "bg-violet-50",  indent: "border-l-2 border-violet-200 ml-6" },
}

export function CategoryManagementPanel({ categories }: { categories: CategoryRow[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [hideInactive, setHideInactive] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const childIds = useMemo(() => {
    const set = new Set<string>()
    for (const cat of categories) {
      if (cat.parent_category_id) set.add(cat.parent_category_id)
    }
    return set
  }, [categories])

  const byId = useMemo(() => {
    return new Map(categories.map((c) => [c.category_id, c]))
  }, [categories])


  function isVisible(cat: CategoryRow) {
    if (hideInactive && !cat.is_active) return false
    let parentId = cat.parent_category_id
    while (parentId) {
      if (collapsed.has(parentId)) return false
      const parent = byId.get(parentId)
      if (hideInactive && parent && !parent.is_active) return false
      parentId = parent?.parent_category_id ?? null
    }
    return true
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visibleCategories = categories.filter(isVisible)
  const allCollapsible = categories.filter((c) => childIds.has(c.category_id))
  const inactiveCount = categories.filter((c) => !c.is_active).length

  function collapseAll() {
    setCollapsed(new Set(allCollapsible.map((c) => c.category_id)))
  }

  function expandAll() {
    setCollapsed(new Set())
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">기자재 분류 관리</h2>
          <p className="text-sm text-muted-foreground">
            분류 코드와 계층 구조를 관리합니다. 코드는 영대문자·숫자·언더스코어만 사용 가능합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowUpload((v) => !v)}>
            <FileUp size={14} />
            엑셀로 등록
          </Button>
          <Button size="sm" onClick={() => setSheetMode({ type: "create-root" })}>
            <Plus size={14} />
            최상위 분류 추가
          </Button>
        </div>
      </div>

      {showUpload && (
        <div className="rounded-md border bg-muted/20 p-4">
          <CategoryUploadPanel onClose={() => setShowUpload(false)} />
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={expandAll}
          className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          전체 펼치기
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          onClick={collapseAll}
          className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        >
          전체 접기
        </button>

        {inactiveCount > 0 && (
          <>
            <span className="text-muted-foreground">·</span>
            <button
              type="button"
              onClick={() => setHideInactive((v) => !v)}
              className={cn(
                "flex items-center gap-1 underline-offset-2 hover:underline",
                hideInactive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <EyeOff size={12} />
              {hideInactive ? `비활성 숨김 (${inactiveCount}개)` : `비활성 숨기기 (${inactiveCount}개)`}
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {[1, 2, 3, 4].map((depth) => (
            <span key={depth} className="flex items-center gap-1">
              <span className={cn(
                "inline-block h-3 w-3 rounded-sm border",
                DEPTH_STYLES[depth]?.row === "bg-white" ? "bg-white border-gray-200" : DEPTH_STYLES[depth]?.row
              )} />
              {depth}단계
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-100 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">분류명</th>
              <th className="px-4 py-2.5 text-left font-medium w-[150px]">코드</th>
              <th className="px-4 py-2.5 text-center font-medium w-[60px]">순서</th>
              <th className="px-4 py-2.5 text-center font-medium w-[70px]">기자재</th>
              <th className="px-4 py-2.5 text-center font-medium w-[70px]">상태</th>
              <th className="px-4 py-2.5 text-right font-medium w-[260px]">액션</th>
            </tr>
          </thead>
          <tbody>
            {visibleCategories.length === 0 && (
              <tr>
                <td colSpan={6} className="h-24 text-center text-muted-foreground">
                  {hideInactive && inactiveCount > 0
                    ? "표시할 활성 분류가 없습니다."
                    : "등록된 분류가 없습니다. 최상위 분류를 추가해 주세요."}
                </td>
              </tr>
            )}
            {visibleCategories.map((cat) => {
              const depthStyle = DEPTH_STYLES[cat.depth] ?? DEPTH_STYLES[4]
              const hasChildren = childIds.has(cat.category_id)
              const isCollapsed = collapsed.has(cat.category_id)
              const canDelete = !hasChildren && cat.equipment_count === 0
              const isConfirming = confirmDeleteId === cat.category_id

              return (
                <tr
                  key={cat.category_id}
                  className={cn("border-b last:border-0 transition-colors hover:brightness-95", depthStyle.row)}
                >
                  <td className="px-3 py-2.5">
                    <div className={cn("flex items-center gap-1.5", depthStyle.indent, cat.depth > 1 && "pl-2")}>
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleCollapse(cat.category_id)}
                          className="shrink-0 rounded p-0.5 hover:bg-black/10 transition-colors"
                          title={isCollapsed ? "펼치기" : "접기"}
                        >
                          {isCollapsed
                            ? <ChevronRight size={14} className="text-muted-foreground" />
                            : <ChevronDown size={14} className="text-muted-foreground" />
                          }
                        </button>
                      ) : (
                        <span className="w-[22px] shrink-0" />
                      )}
                      <span className={cn("font-medium", !cat.is_active && "text-muted-foreground line-through")}>
                        {cat.category_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs font-mono">
                      {cat.category_code}
                    </code>
                  </td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">{cat.sort_order}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">
                    {cat.equipment_count > 0 ? (
                      <span className="font-medium text-foreground">{cat.equipment_count}</span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {cat.is_active ? (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">활성</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">비활성</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      {isConfirming ? (
                        <>
                          <span className="text-xs text-destructive mr-1">삭제할까요?</span>
                          <form action={async (fd) => { await deleteCategory(fd) }}>
                            <input type="hidden" name="categoryId" value={cat.category_id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              확인
                            </Button>
                          </form>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            취소
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setSheetMode({ type: "edit", category: cat })}
                          >
                            <Pencil size={12} />
                            수정
                          </Button>
                          {cat.depth < 4 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setSheetMode({ type: "create-child", parent: cat })}
                            >
                              <FolderPlus size={12} />
                              하위
                            </Button>
                          )}
                          <form action={toggleCategoryActive}>
                            <input type="hidden" name="categoryId" value={cat.category_id} />
                            <input type="hidden" name="isActive" value={String(cat.is_active)} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-7 px-2 text-xs",
                                cat.is_active
                                  ? "text-muted-foreground hover:text-destructive"
                                  : "text-blue-600 hover:text-blue-800"
                              )}
                            >
                              {cat.is_active ? "비활성화" : "활성화"}
                            </Button>
                          </form>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => setConfirmDeleteId(cat.category_id)}
                              title="삭제"
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(open) => { if (!open) setSheetMode(null) }}>
        {sheetMode && (
          <CategoryFormSheet
            key={sheetKey(sheetMode)}
            mode={sheetMode}
            onSuccess={() => setSheetMode(null)}
          />
        )}
      </Sheet>
    </div>
  )
}

function CategoryFormSheet({
  mode,
  onSuccess,
}: {
  mode: SheetMode
  onSuccess: () => void
}) {
  const action = mode.type === "edit" ? updateCategory : createCategory
  const [state, formAction, pending] = useActionState(action, { ok: false, message: "" })

  if (state.ok) {
    onSuccess()
  }

  const isEdit = mode.type === "edit"
  const parentCategory = mode.type === "create-child" ? mode.parent : null
  const editCategory = mode.type === "edit" ? mode.category : null

  const title = isEdit
    ? "분류 수정"
    : parentCategory
      ? `하위 분류 추가 — ${parentCategory.category_name}`
      : "최상위 분류 추가"

  const codePlaceholder = parentCategory
    ? `예: ${parentCategory.category_code}_01`
    : "예: DISC_M"

  return (
    <SheetContent className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        <SheetDescription>
          {isEdit ? "분류명과 코드를 수정합니다." : "새 분류를 등록합니다."}
        </SheetDescription>
      </SheetHeader>
      <form action={formAction} className="space-y-4 px-4 pb-4">
        {isEdit && editCategory && (
          <input type="hidden" name="categoryId" value={editCategory.category_id} />
        )}
        {parentCategory && (
          <input type="hidden" name="parentCategoryId" value={parentCategory.category_id} />
        )}

        {parentCategory && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <div className="text-xs text-muted-foreground mb-0.5">상위 분류</div>
            <div className="font-medium">{parentCategory.category_name}</div>
            <div className="text-xs text-muted-foreground">
              <code>{parentCategory.category_code}</code> · {parentCategory.depth}단계
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="categoryName">분류명</Label>
          <Input
            id="categoryName"
            name="categoryName"
            required
            maxLength={100}
            defaultValue={editCategory?.category_name ?? ""}
            placeholder="예: 펌프류"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryCode">
            분류 코드
            <span className="ml-1.5 text-xs text-muted-foreground">(영대문자·숫자·_ 조합)</span>
          </Label>
          <Input
            id="categoryCode"
            name="categoryCode"
            required
            maxLength={20}
            defaultValue={editCategory?.category_code ?? ""}
            placeholder={codePlaceholder}
            className="font-mono uppercase"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">
            정렬 순서
            <span className="ml-1.5 text-xs text-muted-foreground">(비워두면 자동)</span>
          </Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={1}
            defaultValue={editCategory?.sort_order ?? ""}
            placeholder="1, 2, 3 …"
          />
        </div>

        {state.message && !state.ok && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={pending}>
          <Save size={14} />
          {pending ? "저장 중..." : "저장"}
        </Button>
      </form>
    </SheetContent>
  )
}
