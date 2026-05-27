"use client"

import { useActionState, useState } from "react"
import { Pencil, Plus, Save } from "lucide-react"
import { createCriteria, toggleCriteriaActive, updateCriteria } from "./actions"
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

export type CriteriaRow = {
  criteria_id: string
  criteria_name: string
  max_score: number
  weight: number | null
  description: string | null
  sort_order: number
  is_active: boolean
  usage_count: number
}

type SheetMode =
  | { type: "create" }
  | { type: "edit"; criteria: CriteriaRow }

export function CriteriaManagementPanel({ criteria }: { criteria: CriteriaRow[] }) {
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)

  const totalMaxScore = criteria.filter((c) => c.is_active).reduce((sum, c) => sum + c.max_score, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">평가 기준 관리</h2>
          <p className="text-sm text-muted-foreground">
            업체 평가 시 사용할 항목과 배점을 설정합니다.
            {totalMaxScore > 0 && (
              <span className="ml-2 font-medium text-foreground">총 배점 {totalMaxScore}점</span>
            )}
          </p>
        </div>
        <Button size="sm" onClick={() => setSheetMode({ type: "create" })}>
          <Plus size={14} />
          기준 추가
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-100 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium w-[60px]">순서</th>
              <th className="px-4 py-2.5 text-left font-medium">기준명</th>
              <th className="px-4 py-2.5 text-left font-medium">설명</th>
              <th className="px-4 py-2.5 text-center font-medium w-[80px]">배점</th>
              <th className="px-4 py-2.5 text-center font-medium w-[80px]">가중치</th>
              <th className="px-4 py-2.5 text-center font-medium w-[70px]">사용</th>
              <th className="px-4 py-2.5 text-center font-medium w-[70px]">상태</th>
              <th className="px-4 py-2.5 text-right font-medium w-[160px]">액션</th>
            </tr>
          </thead>
          <tbody>
            {criteria.length === 0 && (
              <tr>
                <td colSpan={8} className="h-24 text-center text-muted-foreground">
                  등록된 평가 기준이 없습니다.
                </td>
              </tr>
            )}
            {criteria.map((c) => (
              <tr key={c.criteria_id} className={cn("border-b last:border-0", !c.is_active && "opacity-50")}>
                <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">{c.sort_order}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("font-medium", !c.is_active && "line-through text-muted-foreground")}>
                    {c.criteria_name}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.description ?? "-"}</td>
                <td className="px-4 py-2.5 text-center font-medium">{c.max_score}점</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">
                  {c.weight != null ? `${c.weight}%` : "-"}
                </td>
                <td className="px-4 py-2.5 text-center text-muted-foreground text-xs">
                  {c.usage_count > 0 ? <span className="font-medium text-foreground">{c.usage_count}회</span> : "-"}
                </td>
                <td className="px-4 py-2.5 text-center">
                  {c.is_active ? (
                    <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">활성</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">비활성</Badge>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSheetMode({ type: "edit", criteria: c })}
                    >
                      <Pencil size={12} />
                      수정
                    </Button>
                    <form action={toggleCriteriaActive}>
                      <input type="hidden" name="criteriaId" value={c.criteria_id} />
                      <input type="hidden" name="isActive" value={String(c.is_active)} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-7 px-2 text-xs",
                          c.is_active
                            ? "text-muted-foreground hover:text-destructive"
                            : "text-blue-600 hover:text-blue-800"
                        )}
                      >
                        {c.is_active ? "비활성화" : "활성화"}
                      </Button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(open) => { if (!open) setSheetMode(null) }}>
        {sheetMode && (
          <CriteriaFormSheet
            key={sheetMode.type === "edit" ? sheetMode.criteria.criteria_id : "create"}
            mode={sheetMode}
            onSuccess={() => setSheetMode(null)}
          />
        )}
      </Sheet>
    </div>
  )
}

function CriteriaFormSheet({
  mode,
  onSuccess,
}: {
  mode: SheetMode
  onSuccess: () => void
}) {
  const action = mode.type === "edit" ? updateCriteria : createCriteria
  const [state, formAction, pending] = useActionState(action, { ok: false, message: "" })
  const editCriteria = mode.type === "edit" ? mode.criteria : null

  if (state.ok) onSuccess()

  return (
    <SheetContent className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{mode.type === "edit" ? "평가 기준 수정" : "평가 기준 추가"}</SheetTitle>
        <SheetDescription>평가 항목의 배점과 가중치를 설정합니다.</SheetDescription>
      </SheetHeader>
      <form action={formAction} className="space-y-4 px-4 pb-4">
        {editCriteria && (
          <input type="hidden" name="criteriaId" value={editCriteria.criteria_id} />
        )}

        <div className="space-y-2">
          <Label htmlFor="criteriaName">기준명</Label>
          <Input
            id="criteriaName"
            name="criteriaName"
            required
            maxLength={100}
            defaultValue={editCriteria?.criteria_name ?? ""}
            placeholder="예: 품질, 납기 준수, 가격 경쟁력"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="maxScore">배점 (만점)</Label>
            <Input
              id="maxScore"
              name="maxScore"
              type="number"
              min={1}
              required
              defaultValue={editCriteria?.max_score ?? ""}
              placeholder="예: 30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weight">
              가중치 (%)
              <span className="ml-1 text-xs text-muted-foreground">선택</span>
            </Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              min={0}
              max={100}
              step={0.1}
              defaultValue={editCriteria?.weight ?? ""}
              placeholder="예: 30"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            설명
            <span className="ml-1 text-xs text-muted-foreground">선택</span>
          </Label>
          <Input
            id="description"
            name="description"
            maxLength={200}
            defaultValue={editCriteria?.description ?? ""}
            placeholder="평가 기준에 대한 설명"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">
            정렬 순서
            <span className="ml-1 text-xs text-muted-foreground">선택 (비워두면 자동)</span>
          </Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={1}
            defaultValue={editCriteria?.sort_order ?? ""}
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
