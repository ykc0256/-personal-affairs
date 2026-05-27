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

export default async function EquipmentDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  const { canViewExecutionPrice } = getPermissions(session)

  const equipment = await prisma.equipments.findUnique({
    where: { equipment_id: id },
    include: {
      equipment_categories: true,
      vendor_items: {
        where: { is_active: true },
        include: {
          vendors: {
            include: {
              vendor_evaluations: {
                orderBy: { evaluation_date: "desc" },
                take: 1,
              },
            },
          },
          design_prices: { where: { is_voided: false }, orderBy: { price_date: "desc" }, take: 2 },
          execution_prices: canViewExecutionPrice
            ? { where: { is_voided: false }, orderBy: { price_date: "desc" }, take: 1 }
            : false,
        },
      },
    },
  })

  if (!equipment) notFound()

  const rankedVendors = equipment.vendor_items
    .map((item) => {
      const latestEvaluation = item.vendors.vendor_evaluations[0]
      const latestDesignPrice = item.design_prices[0]
      const latestExecutionPrice =
        "execution_prices" in item ? item.execution_prices[0] : null

      return {
        item,
        latestEvaluation,
        designPrice: latestDesignPrice ? Number(latestDesignPrice.price) : null,
        executionPrice: latestExecutionPrice
          ? Number(latestExecutionPrice.price)
          : null,
        score: latestEvaluation?.total_score
          ? Number(latestEvaluation.total_score)
          : null,
      }
    })
    .sort((a, b) => {
      if (a.score !== b.score) return (b.score ?? -1) - (a.score ?? -1)
      return (
        (a.designPrice ?? Number.MAX_SAFE_INTEGER) -
        (b.designPrice ?? Number.MAX_SAFE_INTEGER)
      )
    })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href="/equipments" className="text-sm text-muted-foreground hover:underline">
            기자재 목록
          </Link>
          <h1 className="text-xl font-semibold mt-1">
            {equipment.model_name ?? equipment.equipment_code}
          </h1>
          <p className="text-sm text-muted-foreground">
            {equipment.equipment_code}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4 text-sm">
          <div>
            <div className="text-muted-foreground">분류</div>
            <div className="font-medium">
              {equipment.equipment_categories?.category_name ?? "-"}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">단위</div>
            <div className="font-medium">{equipment.unit ?? "-"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">활성 상태</div>
            <div className="font-medium">{equipment.is_active ? "활성" : "비활성"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">GWD ID</div>
            <div className="font-medium">{equipment.gwd_equipment_id ?? "-"}</div>
          </div>
          <div className="md:col-span-4">
            <div className="text-muted-foreground">규격/사양</div>
            <div className="font-medium whitespace-pre-wrap">
              {equipment.specification ?? "-"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            취급 업체 및 가격 우선순위
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>순위</TableHead>
                <TableHead>업체</TableHead>
                <TableHead>평가</TableHead>
                <TableHead>설계가</TableHead>
                <TableHead>설계가 기준일</TableHead>
                {canViewExecutionPrice && <TableHead>실행가</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedVendors.map(({ item, latestEvaluation, designPrice, executionPrice }, index) => (
                <TableRow key={item.vendor_item_id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Link href={`/vendors/${item.vendor_id}`} className="font-medium hover:underline">
                      {item.vendors.vendor_name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {item.vendors.vendor_code}
                    </div>
                  </TableCell>
                  <TableCell>
                    {latestEvaluation ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{latestEvaluation.grade ?? "-"}</Badge>
                        <span className="text-muted-foreground">
                          {latestEvaluation.total_score?.toString() ?? "-"}
                        </span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(designPrice)}</TableCell>
                  <TableCell>{formatDate(item.design_prices[0]?.price_date)}</TableCell>
                  {canViewExecutionPrice && (
                    <TableCell>{formatCurrency(executionPrice)}</TableCell>
                  )}
                </TableRow>
              ))}
              {rankedVendors.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canViewExecutionPrice ? 6 : 5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    취급 업체가 없습니다.
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
