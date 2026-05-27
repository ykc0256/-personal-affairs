"use client"

import { useActionState, useState } from "react"
import { Save, Settings } from "lucide-react"
import { seedDefaultRoles, updateRole } from "./actions"
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

export type RoleRow = {
  role_id: string
  role_name: string
  description: string | null
  can_manage_users: boolean
  can_manage_categories: boolean
  can_manage_equipment: boolean
  can_manage_vendors: boolean
  can_manage_prices: boolean
  can_view_execution_price: boolean
  can_manage_evaluations: boolean
  can_access_admin: boolean
  sort_order: number
  user_count: number
}

const PERMISSION_LABELS: { key: keyof RoleRow; label: string; description: string }[] = [
  { key: "can_access_admin", label: "관리 메뉴 접근", description: "관리 메뉴(/admin) 진입 허용" },
  { key: "can_manage_users", label: "사용자 관리", description: "사용자 계정 및 역할 관리" },
  { key: "can_manage_categories", label: "분류 관리", description: "기자재 분류 체계 편집" },
  { key: "can_manage_equipment", label: "기자재 관리", description: "기자재 등록·수정·비활성화" },
  { key: "can_manage_vendors", label: "업체 관리", description: "업체 등록·수정·비활성화" },
  { key: "can_manage_prices", label: "가격 관리", description: "설계가·실행가 등록·수정·무효화" },
  { key: "can_view_execution_price", label: "실행가 조회", description: "실행가 열람 권한" },
  { key: "can_manage_evaluations", label: "평가 관리", description: "업체 평가 점수 입력·수정" },
]

function permCount(role: RoleRow) {
  return PERMISSION_LABELS.filter((p) => role[p.key]).length
}

export function RoleManagementPanel({ roles }: { roles: RoleRow[] }) {
  const [editRole, setEditRole] = useState<RoleRow | null>(null)
  const [seedState, seedAction, seedPending] = useActionState(seedDefaultRoles, { ok: false, message: "" })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">역할 목록</h2>
          <p className="text-sm text-muted-foreground">
            역할별 권한을 설정합니다. 역할은 관리자·조달·엔지니어·열람 4종으로 고정됩니다.
          </p>
        </div>
        {roles.length === 0 && (
          <form action={seedAction}>
            <Button size="sm" type="submit" disabled={seedPending}>
              <Settings size={14} />
              {seedPending ? "설정 중..." : "기본 역할 초기화"}
            </Button>
          </form>
        )}
      </div>

      {seedState.message && (
        <p className={`text-sm ${seedState.ok ? "text-green-700" : "text-destructive"}`}>
          {seedState.message}
        </p>
      )}

      {roles.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          등록된 역할이 없습니다. 기본 역할 초기화 버튼을 눌러 4개 역할을 생성하세요.
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-100 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">역할명</th>
                <th className="px-4 py-2.5 text-left font-medium">설명</th>
                <th className="px-4 py-2.5 text-center font-medium w-[90px]">권한 수</th>
                <th className="px-4 py-2.5 text-center font-medium w-[70px]">사용자</th>
                <th className="px-4 py-2.5 text-right font-medium w-[100px]">액션</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.role_id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{role.role_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {role.description ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${permCount(role) === 0 ? "text-muted-foreground" : "text-foreground"}`}>
                      {permCount(role)} / {PERMISSION_LABELS.length}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    {role.user_count > 0
                      ? <span className="font-medium text-foreground">{role.user_count}</span>
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setEditRole(role)}
                    >
                      수정
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={editRole !== null} onOpenChange={(open) => { if (!open) setEditRole(null) }}>
        {editRole && (
          <RoleFormSheet
            key={editRole.role_id}
            role={editRole}
            onSuccess={() => setEditRole(null)}
          />
        )}
      </Sheet>
    </div>
  )
}

function RoleFormSheet({ role, onSuccess }: { role: RoleRow; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(updateRole, { ok: false, message: "" })
  const [perms, setPerms] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PERMISSION_LABELS.map((p) => [p.key, Boolean(role[p.key])]))
  )

  if (state.ok) onSuccess()

  function togglePerm(key: string) {
    setPerms((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
      <SheetHeader>
        <SheetTitle>역할 수정 — {role.role_name}</SheetTitle>
        <SheetDescription>역할명과 권한을 수정합니다.</SheetDescription>
      </SheetHeader>
      <form action={formAction} className="space-y-5 px-4 pb-4">
        <input type="hidden" name="roleId" value={role.role_id} />
        {PERMISSION_LABELS.map((p) => (
          <input
            key={p.key}
            type="hidden"
            name={p.key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}
            value={String(perms[p.key] ?? false)}
          />
        ))}

        <div className="space-y-2">
          <Label htmlFor="roleName">역할명</Label>
          <Input
            id="roleName"
            name="roleName"
            required
            maxLength={50}
            defaultValue={role.role_name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">설명 (선택)</Label>
          <Input
            id="description"
            name="description"
            maxLength={200}
            defaultValue={role.description ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label>권한 설정</Label>
          <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2 border">
            기자재·업체·가격 <strong>열람</strong>은 로그인한 모든 사용자에게 기본 허용됩니다.
            아무것도 체크하지 않으면 열람 전용 역할이 됩니다.
          </p>
          <div className="rounded-md border divide-y">
            {PERMISSION_LABELS.map((p) => {
              const checked = perms[p.key] ?? false
              return (
                <label
                  key={p.key}
                  className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0"
                    checked={checked}
                    onChange={() => togglePerm(p.key)}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.description}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">
            정렬 순서
            <span className="ml-1.5 text-xs text-muted-foreground">(낮을수록 먼저)</span>
          </Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={role.sort_order}
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
