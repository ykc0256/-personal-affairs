import Link from "next/link"
import { auth } from "@/auth"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { filterEffectivelyActive, getCategoryDescendantIds } from "@/lib/category"
import { CategoryTree } from "@/components/category-tree"
import { formatCurrency, formatDate } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function textParam(
  params: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

function makeHref(
  params: Record<string, string | string[] | undefined>,
  patch: Record<string, string | undefined>
) {
  const next = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const text = Array.isArray(value) ? value[0] : value
    if (text) next.set(key, text)
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  const query = next.toString()
  return query ? `/prices?${query}` : "/prices"
}

export default async function PricesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {}
  const selectedCategoryId = textParam(params, "category")
  const query = textParam(params, "q")?.trim()
  const session = await auth()
  const { canViewExecutionPrice } = getPermissions(session)

  const categories = filterEffectivelyActive(
    await prisma.equipment_categories.findMany({
      where: { is_active: true },
      orderBy: [{ depth: "asc" }, { sort_order: "asc" }, { category_name: "asc" }],
    })
  )
  const categoryIds = getCategoryDescendantIds(categories, selectedCategoryId)
  const categoryHrefs = Object.fromEntries(
    categories.map((category) => [
      category.category_id,
      makeHref(params, { category: category.category_id }),
    ])
  )

  const vendorItems = await prisma.vendor_items.findMany({
    where: {
      is_active: true,
      ...(categoryIds ? { equipments: { category_id: { in: categoryIds } } } : {}),
      ...(query
        ? {
            OR: [
              {
                equipments: {
                  equipment_code: { contains: query, mode: "insensitive" },
                },
              },
              {
                equipments: {
                  model_name: { contains: query, mode: "insensitive" },
                },
              },
              {
                equipments: {
                  specification: { contains: query, mode: "insensitive" },
                },
              },
              {
                vendors: {
                  vendor_name: { contains: query, mode: "insensitive" },
                },
              },
              {
                vendors: {
                  vendor_code: { contains: query, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      vendors: true,
      equipments: { include: { equipment_categories: true } },
      design_prices: { where: { is_voided: false }, orderBy: { price_date: "desc" }, take: 2 },
      execution_prices: canViewExecutionPrice
        ? { where: { is_voided: false }, orderBy: { price_date: "desc" }, take: 1 }
        : false,
    },
    orderBy: [{ updated_at: "desc" }],
    take: 500,
  })

  return (
    <div className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden min-w-0 lg:sticky lg:top-20 lg:block">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">기자재 분류</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-9rem)] overflow-y-auto overflow-x-hidden">
            <CategoryTree
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              allHref={makeHref(params, { category: undefined })}
              categoryHrefs={categoryHrefs}
              allLabel="전체 가격"
              storageKey="vendor-item-db:equipment-category-tree"
            />
          </CardContent>
        </Card>
      </aside>

      <main className="min-w-0 flex-1 space-y-5 overflow-hidden">
        <div>
          <h1 className="text-xl font-semibold">가격 비교</h1>
          <p className="text-sm text-muted-foreground">
            기자재, 규격, 업체를 기준으로 최신 설계가와 직전 대비 변동을 확인합니다.
          </p>
        </div>

        <div className="lg:hidden">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">기자재 분류</CardTitle>
            </CardHeader>
            <CardContent className="max-h-72 overflow-y-auto overflow-x-hidden">
              <CategoryTree
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                allHref={makeHref(params, { category: undefined })}
                categoryHrefs={categoryHrefs}
                allLabel="전체 가격"
                storageKey="vendor-item-db:equipment-category-tree"
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">검색 조건</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-wrap items-center gap-3">
              <Input
                name="q"
                defaultValue={query}
                placeholder="기자재명 / 규격 / 업체명 검색"
                className="max-w-md"
              />
              {selectedCategoryId && (
                <input type="hidden" name="category" value={selectedCategoryId} />
              )}
              <Button type="submit">검색</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                최신 가격 비교표 {vendorItems.length.toLocaleString("ko-KR")}건
              </CardTitle>
              {!canViewExecutionPrice && (
                <Badge variant="outline">실행가 숨김</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">분류</TableHead>
                  <TableHead className="w-[200px]">기자재</TableHead>
                  <TableHead className="w-[140px]">업체</TableHead>
                  <TableHead>규격/사양</TableHead>
                  <TableHead className="w-[120px] text-right">설계가</TableHead>
                  <TableHead className="w-[100px]">기준일</TableHead>
                  <TableHead className="w-[110px] text-right">직전 대비</TableHead>
                  {canViewExecutionPrice && <TableHead className="w-[120px] text-right">실행가</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendorItems.map((item) => {
                  const latestDesignPrice = item.design_prices[0]
                  const previousDesignPrice = item.design_prices[1]
                  const diff =
                    latestDesignPrice && previousDesignPrice
                      ? Number(latestDesignPrice.price) -
                        Number(previousDesignPrice.price)
                      : null
                  const latestExecutionPrice =
                    "execution_prices" in item ? item.execution_prices[0] : null

                  return (
                    <TableRow key={item.vendor_item_id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.equipments.equipment_categories?.category_name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/equipments/${item.equipment_id}`}
                          className="font-medium hover:underline text-sm"
                        >
                          {item.equipments.model_name ?? item.equipments.equipment_code}
                        </Link>
                        <div className="text-xs text-muted-foreground font-mono">
                          {item.equipments.equipment_code}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <Link
                          href={`/vendors/${item.vendor_id}`}
                          className="hover:underline"
                        >
                          {item.vendors.vendor_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.equipments.specification ?? "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(latestDesignPrice?.price)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(latestDesignPrice?.price_date)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {diff === null ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span
                            className={
                              diff > 0
                                ? "text-red-600"
                                : diff < 0
                                  ? "text-blue-600"
                                  : "text-muted-foreground"
                            }
                          >
                            {diff > 0 ? "+" : ""}
                            {formatCurrency(diff)}
                          </span>
                        )}
                      </TableCell>
                      {canViewExecutionPrice && (
                        <TableCell className="text-right text-sm">
                          {formatCurrency(latestExecutionPrice?.price)}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
                {vendorItems.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canViewExecutionPrice ? 8 : 7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      비교할 가격 데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
