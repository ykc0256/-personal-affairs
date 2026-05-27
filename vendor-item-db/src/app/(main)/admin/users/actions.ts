"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { getPermissions } from "@/lib/permissions"
import bcrypt from "bcryptjs"

async function requireAdmin() {
  const session = await auth()
  const perms = getPermissions(session)
  if (!perms.canManageUsers) throw new Error("권한이 없습니다")
}

type ActionState = { ok: boolean; message: string }

export async function createUser(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
    const username = String(formData.get("username") ?? "").trim()
    const email = String(formData.get("email") ?? "").trim()
    const password = String(formData.get("password") ?? "")
    const displayName = String(formData.get("displayName") ?? "").trim() || null
    const roleId = String(formData.get("roleId") ?? "").trim() || null

    if (!username) return { ok: false, message: "아이디를 입력해 주세요" }
    if (!email) return { ok: false, message: "이메일을 입력해 주세요" }
    if (!password || password.length < 6) return { ok: false, message: "비밀번호는 6자 이상이어야 합니다" }

    const hash = await bcrypt.hash(password, 12)
    await prisma.users.create({
      data: {
        username,
        email,
        password_hash: hash,
        display_name: displayName,
        role: "viewer",
        role_id: roleId,
        is_active: true,
      },
    })
    revalidatePath("/admin/users")
    return { ok: true, message: "사용자가 생성되었습니다" }
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false, message: "이미 사용 중인 아이디 또는 이메일입니다" }
    return { ok: false, message: String(e) }
  }
}

export async function updateUser(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
    const userId = String(formData.get("userId") ?? "")
    const displayName = String(formData.get("displayName") ?? "").trim() || null
    const email = String(formData.get("email") ?? "").trim()
    const roleId = String(formData.get("roleId") ?? "").trim() || null
    const isActive = formData.get("isActive") === "true"

    if (!email) return { ok: false, message: "이메일을 입력해 주세요" }

    await prisma.users.update({
      where: { user_id: userId },
      data: { display_name: displayName, email, role_id: roleId, is_active: isActive },
    })
    revalidatePath("/admin/users")
    return { ok: true, message: "사용자 정보가 수정되었습니다" }
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { ok: false, message: "이미 사용 중인 이메일입니다" }
    return { ok: false, message: String(e) }
  }
}

export async function resetPassword(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin()
    const userId = String(formData.get("userId") ?? "")
    const password = String(formData.get("password") ?? "")
    if (!password || password.length < 6) return { ok: false, message: "비밀번호는 6자 이상이어야 합니다" }

    const hash = await bcrypt.hash(password, 12)
    await prisma.users.update({
      where: { user_id: userId },
      data: { password_hash: hash },
    })
    revalidatePath("/admin/users")
    return { ok: true, message: "비밀번호가 변경되었습니다" }
  } catch (e) {
    return { ok: false, message: String(e) }
  }
}

export async function toggleUserActive(formData: FormData) {
  await requireAdmin()
  const userId = String(formData.get("userId") ?? "")
  const isActive = formData.get("isActive") === "true"
  await prisma.users.update({
    where: { user_id: userId },
    data: { is_active: !isActive },
  })
  revalidatePath("/admin/users")
}

export async function deleteUser(
  prevState: { ok: boolean; message: string },
  formData: FormData
): Promise<{ ok: boolean; message: string }> {
  try {
    await requireAdmin()
    const userId = String(formData.get("userId") ?? "")
    await prisma.users.delete({ where: { user_id: userId } })
    revalidatePath("/admin/users")
    return { ok: true, message: "" }
  } catch (e) {
    if ((e as { code?: string }).code === "P2003") {
      return { ok: false, message: "연결된 데이터가 있어 삭제할 수 없습니다. 비활성화를 사용해 주세요." }
    }
    return { ok: false, message: String(e) }
  }
}
