import { auth } from "@/auth"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/format"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function EvaluationsPage() {
  const session = await auth()
  const perms = getPermissions(session)
  if (!perms.canManageEvaluations) redirect("/")

  const evaluations = await prisma.vendor_evaluations.findMany({
    include: {
      vendors: true,
      users_vendor_evaluations_evaluator_idTousers: {
        select: { display_name: true, username: true },
      },
      evaluation_scores: {
        include: { evaluation_criteria: true },
        orderBy: { evaluation_criteria: { sort_order: "asc" } },
      },
    },
    orderBy: { evaluation_date: "desc" },
    take: 100,
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">업체 평가</h1>
        <p className="text-sm text-muted-foreground">
          구매 권한 사용자가 업체별 평가 이력, 총점, 등급을 확인합니다.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-medium">평가 목록</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[160px]">업체</TableHead>
                <TableHead className="w-[100px]">평가일</TableHead>
                <TableHead className="w-[100px]">평가자</TableHead>
                <TableHead className="w-[80px] text-right">총점</TableHead>
                <TableHead className="w-[80px]">등급</TableHead>
                <TableHead>평가 항목</TableHead>
                <TableHead>의견</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evaluations.map((evaluation) => {
                const evaluator =
                  evaluation.users_vendor_evaluations_evaluator_idTousers

                return (
                  <TableRow key={evaluation.evaluation_id}>
                    <TableCell>
                      <div className="font-medium">
                        {evaluation.vendors.vendor_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {evaluation.vendors.vendor_code}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(evaluation.evaluation_date)}</TableCell>
                    <TableCell>
                      {evaluator?.display_name ?? evaluator?.username ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {evaluation.total_score?.toString() ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{evaluation.grade ?? "-"}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[260px] whitespace-normal text-muted-foreground">
                      {evaluation.evaluation_scores
                        .map(
                          (score) =>
                            `${score.evaluation_criteria.criteria_name} ${score.score.toString()}`
                        )
                        .join(" / ") || "-"}
                    </TableCell>
                    <TableCell className="max-w-[260px] whitespace-normal text-muted-foreground">
                      {evaluation.notes ?? "-"}
                    </TableCell>
                  </TableRow>
                )
              })}
              {evaluations.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    등록된 평가가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
