import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { CriteriaManagementPanel } from "./criteria-management"

export default async function EvaluationCriteriaPage() {
  const session = await auth()
  const perms = getPermissions(session)
  if (!perms.canManageEvaluations) redirect("/")

  const criteria = await prisma.evaluation_criteria.findMany({
    orderBy: [{ sort_order: "asc" }, { criteria_name: "asc" }],
    include: { _count: { select: { evaluation_scores: true } } },
  })

  const rows = criteria.map((c) => ({
    criteria_id: c.criteria_id,
    criteria_name: c.criteria_name,
    max_score: c.max_score,
    weight: c.weight ? Number(c.weight) : null,
    description: c.description,
    sort_order: c.sort_order,
    is_active: c.is_active,
    usage_count: c._count.evaluation_scores,
  }))

  return (
    <div className="space-y-5">
      <div>
        <nav className="text-sm text-muted-foreground mb-1">
          <a href="/admin" className="hover:underline">관리</a>
          {" / "}
          <span>평가 기준</span>
        </nav>
        <h1 className="text-xl font-semibold">평가 기준 관리</h1>
        <p className="text-sm text-muted-foreground">
          총 {criteria.length}개 기준 · 활성 {criteria.filter((c) => c.is_active).length}개
        </p>
      </div>

      <CriteriaManagementPanel criteria={rows} />
    </div>
  )
}
