"use client"

import { useActionState, useState } from "react"
import { EyeOff, KeyRound, Plus, Save, Trash2, UserCheck, UserX } from "lucide-react"
import { createUser, deleteUser, resetPassword, toggleUserActive, updateUser } from "./actions"
import { cn } from "@/lib/utils"
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

export type RoleOption = {
  role_id: string
  role_name: string
}

export type UserRowData = {
  user_id: string
  username: string
  email: string
  display_name: string | null
  role: string
  role_id: string | null
  role_name: string | null
  is_active: boolean
  last_login_at: string | null
}

type SheetMode =
  | { type: "create" }
  | { type: "edit"; user: UserRowData }
  | { type: "password"; user: UserRowData }

export function UserManagementPanel({
  users,
  roles,
}: {
  users: UserRowData[]
  roles: RoleOption[]
}) {
  const [sheetMode, setSheetMode] = useState<SheetMode | null>(null)
  const [hideInactive, setHideInactive] = useState(true)

  const inactiveCount = users.filter((u) => !u.is_active).length
  const visibleUsers = hideInactive ? users.filter((u) => u.is_active) : users

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">사용자 목록</h2>
          <p className="text-sm text-muted-foreground">
            총 {users.length}명 · 활성 {users.filter((u) => u.is_active).length}명
          </p>
        </div>
        <div className="flex items-center gap-2">
          {inactiveCount > 0 && (
            <button
              type="button"
              onClick={() => setHideInactive((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-sm underline-offset-2 hover:underline",
                hideInactive ? "text-muted-foreground hover:text-foreground" : "text-foreground font-medium"
              )}
            >
              <EyeOff size={13} />
              {hideInactive ? `비활성 숨김 (${inactiveCount}명)` : `비활성 표시 중 (${inactiveCount}명)`}
            </button>
          )}
          <Button size="sm" onClick={() => setSheetMode({ type: "create" })}>
            <Plus size={14} />
            사용자 추가
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-100 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">아이디</th>
              <th className="px-4 py-2.5 text-left font-medium">이름</th>
              <th className="px-4 py-2.5 text-left font-medium">이메일</th>
              <th className="px-4 py-2.5 text-left font-medium w-[130px]">역할</th>
              <th className="px-4 py-2.5 text-center font-medium w-[70px]">상태</th>
              <th className="px-4 py-2.5 text-left font-medium w-[120px]">최근 로그인</th>
              <th className="px-4 py-2.5 text-right font-medium w-[220px]">액션</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 && (
              <tr>
                <td colSpan={7} className="h-24 text-center text-muted-foreground">
                  {hideInactive && inactiveCount > 0
                    ? "표시할 활성 사용자가 없습니다."
                    : "등록된 사용자가 없습니다."}
                </td>
              </tr>
            )}
            {visibleUsers.map((user) => (
              <UserRow
                key={user.user_id}
                user={user}
                onEdit={() => setSheetMode({ type: "edit", user })}
                onPasswordChange={() => setSheetMode({ type: "password", user })}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={sheetMode !== null} onOpenChange={(open) => { if (!open) setSheetMode(null) }}>
        {sheetMode && (
          sheetMode.type === "password" ? (
            <PasswordSheet
              key={`pw-${sheetMode.user.user_id}`}
              user={sheetMode.user}
              onSuccess={() => setSheetMode(null)}
            />
          ) : (
            <UserFormSheet
              key={sheetMode.type === "edit" ? sheetMode.user.user_id : "create"}
              mode={sheetMode}
              roles={roles}
              onSuccess={() => setSheetMode(null)}
            />
          )
        )}
      </Sheet>
    </div>
  )
}

function UserRow({
  user,
  onEdit,
  onPasswordChange,
}: {
  user: UserRowData
  onEdit: () => void
  onPasswordChange: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleteState, deleteAction, deletePending] = useActionState(deleteUser, { ok: false, message: "" })

  return (
    <>
      <tr className={cn("border-b last:border-0 hover:bg-gray-50", !user.is_active && "opacity-60")}>
        <td className="px-4 py-3 font-mono text-xs">{user.username}</td>
        <td className="px-4 py-3">{user.display_name ?? <span className="text-muted-foreground">-</span>}</td>
        <td className="px-4 py-3 text-muted-foreground text-xs">{user.email}</td>
        <td className="px-4 py-3">
          {user.role_name
            ? <span className="text-xs">{user.role_name}</span>
            : <span className="text-xs text-muted-foreground">{user.role}</span>}
        </td>
        <td className="px-4 py-3 text-center">
          {user.is_active
            ? <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">활성</Badge>
            : <Badge variant="outline" className="text-xs text-muted-foreground">비활성</Badge>}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString("ko-KR") : "-"}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            {confirming ? (
              <>
                <span className="text-xs text-destructive mr-1">삭제할까요?</span>
                <form action={deleteAction}>
                  <input type="hidden" name="userId" value={user.user_id} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={deletePending}
                  >
                    확인
                  </Button>
                </form>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setConfirming(false)}>
                  취소
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onEdit}>
                  수정
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onPasswordChange} title="비밀번호 변경">
                  <KeyRound size={12} />
                </Button>
                <form action={toggleUserActive}>
                  <input type="hidden" name="userId" value={user.user_id} />
                  <input type="hidden" name="isActive" value={String(user.is_active)} />
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className={user.is_active
                      ? "h-7 px-2 text-xs text-muted-foreground hover:text-amber-600"
                      : "h-7 px-2 text-xs text-blue-600 hover:text-blue-800"}
                    title={user.is_active ? "비활성화" : "활성화"}
                  >
                    {user.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
                  </Button>
                </form>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirming(true)}
                  title="삭제"
                >
                  <Trash2 size={12} />
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
      {deleteState.message && !deleteState.ok && (
        <tr className="border-b last:border-0">
          <td colSpan={7} className="px-4 py-2 text-xs text-destructive bg-destructive/5">
            {deleteState.message}
          </td>
        </tr>
      )}
    </>
  )
}

function UserFormSheet({
  mode,
  roles,
  onSuccess,
}: {
  mode: { type: "create" } | { type: "edit"; user: UserRowData }
  roles: RoleOption[]
  onSuccess: () => void
}) {
  const isEdit = mode.type === "edit"
  const editUser = mode.type === "edit" ? mode.user : null
  const action = isEdit ? updateUser : createUser
  const [state, formAction, pending] = useActionState(action, { ok: false, message: "" })

  if (state.ok) onSuccess()

  return (
    <SheetContent className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{isEdit ? "사용자 수정" : "사용자 추가"}</SheetTitle>
        <SheetDescription>
          {isEdit ? "사용자 정보와 역할을 수정합니다." : "새 사용자 계정을 생성합니다."}
        </SheetDescription>
      </SheetHeader>
      <form action={formAction} className="space-y-4 px-4 pb-4">
        {isEdit && editUser && (
          <input type="hidden" name="userId" value={editUser.user_id} />
        )}

        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="username">아이디</Label>
            <Input
              id="username"
              name="username"
              required
              maxLength={50}
              placeholder="영문·숫자 조합"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="displayName">이름</Label>
          <Input
            id="displayName"
            name="displayName"
            maxLength={100}
            defaultValue={editUser?.display_name ?? ""}
            placeholder="표시될 이름"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            maxLength={200}
            defaultValue={editUser?.email ?? ""}
          />
        </div>

        {!isEdit && (
          <div className="space-y-2">
            <Label htmlFor="password">초기 비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="6자 이상"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="roleId">역할</Label>
          <select
            id="roleId"
            name="roleId"
            defaultValue={editUser?.role_id ?? ""}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">역할 없음</option>
            {roles.map((role) => (
              <option key={role.role_id} value={role.role_id}>
                {role.role_name}
              </option>
            ))}
          </select>
        </div>

        {isEdit && editUser && (
          <div className="space-y-2">
            <Label>계정 상태</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="isActive" value="true" defaultChecked={editUser.is_active} />
                활성
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name="isActive" value="false" defaultChecked={!editUser.is_active} />
                비활성
              </label>
            </div>
          </div>
        )}

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

function PasswordSheet({ user, onSuccess }: { user: UserRowData; onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(resetPassword, { ok: false, message: "" })
  if (state.ok) onSuccess()

  return (
    <SheetContent className="w-full sm:max-w-md">
      <SheetHeader>
        <SheetTitle>비밀번호 변경</SheetTitle>
        <SheetDescription>
          {user.display_name ?? user.username} ({user.username}) 의 비밀번호를 변경합니다.
        </SheetDescription>
      </SheetHeader>
      <form action={formAction} className="space-y-4 px-4 pb-4">
        <input type="hidden" name="userId" value={user.user_id} />
        <div className="space-y-2">
          <Label htmlFor="password">새 비밀번호</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="6자 이상"
          />
        </div>
        {state.message && !state.ok && (
          <p className="text-sm text-destructive">{state.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          <KeyRound size={14} />
          {pending ? "변경 중..." : "비밀번호 변경"}
        </Button>
      </form>
    </SheetContent>
  )
}
