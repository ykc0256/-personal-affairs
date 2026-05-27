import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDate } from "@/lib/format"
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

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function VendorDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  const { canViewExecutionPrice } = getPermissions(session)

  const vendor = await prisma.vendors.findUnique({
    where: { vendor_id: id },
    include: {
      vendor_items: {
        where: { is_active: true },
        include: {
          equipments: { include: { equipment_categories: true } },
          design_prices: { where: { is_voided: false }, orderBy: { price_date: "desc" }, take: 1 },
          execution_prices: canViewExecutionPrice
            ? { where: { is_voided: false }, orderBy: { price_date: "desc" }, take: 1 }
            : false,
        },
      },
      vendor_evaluations: {
        orderBy: { evaluation_date: "desc" },
        include: {
          users_vendor_evaluations_evaluator_idTousers: {
            select: { display_name: true, username: true },
          },
        },
      },
    },
  })

  if (!vendor) notFound()

  const latestEvaluation = vendor.vendor_evaluations[0]

  return (
    <div className="space-y-5">
      <div>
        <Link href="/vendors" className="text-sm text-muted-foreground hover:underline">
          업체 목록
        </Link>
        <h1 className="text-xl font-semibold mt-1">{vendor.vendor_name}</h1>
        <p className="text-sm text-muted-foreground">{vendor.vendor_code}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <div className="text-muted-foreground">유형</div>
              <div className="font-medium">{vendor.vendor_type ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">국가</div>
              <div className="font-medium">{vendor.country ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">사업자번호</div>
              <div className="font-medium">{vendor.business_no ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">재무등급</div>
              <div className="font-medium">{vendor.financial_grade ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">매출 기준연도</div>
              <div className="font-medium">{vendor.revenue_base_year ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">활성 상태</div>
              <div className="font-medium">{vendor.is_active ? "활성" : "비활성"}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">최근 평가</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {latestEvaluation ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{latestEvaluation.grade ?? "-"}</Badge>
                  <span className="font-medium">
                    {latestEvaluation.total_score?.toString() ?? "-"}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {formatDate(latestEvaluation.evaluation_date)}
                </div>
                <div className="text-muted-foreground">
                  평가자{" "}
                  {latestEvaluation.users_vendor_evaluations_evaluator_idTousers
                    ?.display_name ??
                    latestEvaluation.users_vendor_evaluations_evaluator_idTousers
                      ?.username ??
                    "-"}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">평가 이력이 없습니다.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">취급 기자재</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>분류</TableHead>
                <TableHead>기자재</TableHead>
                <TableHead>규격/사양</TableHead>
                <TableHead>설계가</TableHead>
                <TableHead>설계가 기준일</TableHead>
                {canViewExecutionPrice && <TableHead>실행가</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendor.vendor_items.map((item) => {
                const latestDesignPrice = item.design_prices[0]
                const latestExecutionPrice =
                  "execution_prices" in item ? item.execution_prices[0] : null

                return (
                  <TableRow key={item.vendor_item_id}>
                    <TableCell className="text-muted-foreground">
                      {item.equipments.equipment_categories?.category_name ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/equipments/${item.equipment_id}`}
                        className="font-medium hover:underline"
                      >
                        {item.equipments.model_name ?? item.equipments.equipment_code}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {item.equipments.equipment_code}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[320px] whitespace-normal text-muted-foreground">
                      {item.equipments.specification ?? "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(latestDesignPrice?.price)}</TableCell>
                    <TableCell>{formatDate(latestDesignPrice?.price_date)}</TableCell>
                    {canViewExecutionPrice && (
                      <TableCell>
                        {formatCurrency(latestExecutionPrice?.price)}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {vendor.vendor_items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canViewExecutionPrice ? 6 : 5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    취급 기자재가 없습니다.
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
