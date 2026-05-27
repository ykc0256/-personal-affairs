"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type ActionState = { ok: boolean; message: string }

async function requireAuth() {
  const session = await auth()
  const user = session?.user as { id?: string; role?: string } | undefined
  if (!user?.id) return null
  if (user.role !== "admin" && user.role !== "procurement") return null
  return user
}

export async function createEvaluation(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const vendorId = formData.get("vendorId") as string
  const evaluationDate = formData.get("evaluationDate") as string
  const grade = (formData.get("grade") as string)?.trim() || null
  const notes = (formData.get("notes") as string)?.trim() || null

  if (!vendorId) return { ok: false, message: "업체를 찾을 수 없습니다." }
  if (!evaluationDate) return { ok: false, message: "평가일을 입력해 주세요." }

  // Collect scores: score_<criteriaId> fields
  const scores: { criteriaId: string; score: number }[] = []
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("score_")) {
      const criteriaId = key.replace("score_", "")
      const score = parseFloat(value as string)
      if (Number.isFinite(score) && score >= 0) {
        scores.push({ criteriaId, score })
      }
    }
  }

  // Calculate total score (sum of all entered scores)
  const totalScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s.score, 0)
    : null

  // Auto-calculate grade from percentage if not manually provided
  let finalGrade = grade || null
  if (!finalGrade && scores.length > 0 && totalScore !== null) {
    const criteriaList = await prisma.evaluation_criteria.findMany({
      where: { criteria_id: { in: scores.map((s) => s.criteriaId) } },
      select: { max_score: true },
    })
    const totalMax = criteriaList.reduce((sum, c) => sum + c.max_score, 0)
    if (totalMax > 0) {
      const pct = (totalScore / totalMax) * 100
      if (pct >= 90) finalGrade = "A"
      else if (pct >= 80) finalGrade = "B"
      else if (pct >= 70) finalGrade = "C"
      else if (pct >= 60) finalGrade = "D"
      else finalGrade = "F"
    }
  }

  await prisma.$transaction(async (tx) => {
    const evaluation = await tx.vendor_evaluations.create({
      data: {
        vendor_id: vendorId,
        evaluation_date: new Date(evaluationDate),
        evaluator_id: user.id ?? null,
        total_score: totalScore,
        grade: finalGrade,
        notes,
      },
    })

    if (scores.length > 0) {
      await tx.evaluation_scores.createMany({
        data: scores.map((s) => ({
          evaluation_id: evaluation.evaluation_id,
          criteria_id: s.criteriaId,
          score: s.score,
        })),
      })
    }
  })

  revalidatePath("/vendors")
  revalidatePath("/equipments")
  revalidatePath("/evaluations")
  revalidatePath("/")
  return { ok: true, message: "평가를 등록했습니다." }
}

export async function deleteEvaluation(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireAuth()
  if (!user) return { ok: false, message: "권한이 없습니다." }

  const evaluationId = formData.get("evaluationId") as string
  if (!evaluationId) return { ok: false, message: "평가를 찾을 수 없습니다." }

  await prisma.$transaction(async (tx) => {
    await tx.evaluation_scores.deleteMany({ where: { evaluation_id: evaluationId } })
    await tx.vendor_evaluations.delete({ where: { evaluation_id: evaluationId } })
  })

  revalidatePath("/vendors")
  revalidatePath("/equipments")
  revalidatePath("/evaluations")
  revalidatePath("/")
  return { ok: true, message: "삭제했습니다." }
}
