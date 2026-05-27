import Link from "next/link"
import { auth } from "@/auth"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { compareValues, filterEffectivelyActive, getCategoryDescendantIds } from "@/lib/category"
import { formatCount } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryTree } from "@/components/category-tree"
import { EquipmentPageHeader } from "@/components/equipment-page-header"
import { EquipmentDownloadButton, EquipmentRows, type EquipmentRow } from "@/components/equipment-rows"
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

type SortKey =
  | "category"
  | "equipment"
  | "vendor"
  | "country"
  | "designPrice"
  | "executionPrice"
  | "grade"

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
  return query ? `/equipments?${query}` : "/equipments"
}

function latestActivePrice<
  T extends {
    price: unknown
    price_date: Date
    source: string | null
    is_voided: boolean
  },
>(prices: T[]) {
  return prices
    .filter((price) => !price.is_voided)
    .sort((a, b) => b.price_date.getTime() - a.price_date.getTime())[0]
}

function SortHeader({
  label,
  sortKey,
  activeSort,
  direction,
  params,
}: {
  label: string
  sortKey: SortKey
  activeSort: string
  direction: "asc" | "desc"
  params: Record<string, string | string[] | undefined>
}) {
  const nextDirection =
    activeSort === sortKey && direction === "asc" ? "desc" : "asc"
  const marker =
    activeSort === sortKey ? (direction === "asc" ? " ▲" : " ▼") : ""

  return (
    <Link
      href={makeHref(params, { sort: sortKey, dir: nextDirection })}
      className="flex min-w-0 items-center hover:underline"
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0">{marker}</span>
    </Link>
  )
}

export default async function EquipmentsPage({ searchParams }: PageProps) {
  const session = await auth()
  const { canManageEquipment, canManagePrices, canViewExecutionPrice } = getPermissions(session)
  const params = (await searchParams) ?? {}
  const query = textParam(params, "q")?.trim()
  const selectedCategoryId = textParam(params, "category")
  const activeSort = (textParam(params, "sort") ?? "equipment") as SortKey
  const direction = textParam(params, "dir") === "desc" ? "desc" : "asc"
  const showInactive = textParam(params, "showInactive") === "true"

  const categories = filterEffectivelyActive(
    await prisma.equipment_categories.findMany({
      where: { is_active: true },
      orderBy: [{ depth: "asc" }, { sort_order: "asc" }, { category_name: "asc" }],
    })
  )
  const vendors = await prisma.vendors.findMany({
    where: { is_active: true },
    orderBy: { vendor_name: "asc" },
    select: { vendor_id: true, vendor_code: true, vendor_name: true },
  })
  const categoryHrefs = Object.fromEntries(
    categories.map((category) => [
      category.category_id,
      makeHref(params, { category: category.category_id }),
    ])
  )
  const categoryIds = getCategoryDescendantIds(categories, selectedCategoryId)
  const effectivelyActiveCategoryIds = categories.map((c) => c.category_id)

  const equipments = await prisma.equipments.findMany({
    where: {
      AND: [
        showInactive ? {} : { is_active: true },
        // 분류가 지정된 기자재는 해당 분류가 유효 활성인 경우만 표시
        // 분류 미지정(null)은 항상 표시
        categoryIds
          ? { category_id: { in: categoryIds } }
          : { OR: [{ category_id: null }, { category_id: { in: effectivelyActiveCategoryIds } }] },
        query
          ? {
              OR: [
                { model_name: { contains: query, mode: "insensitive" } },
                { manufacturer_model_no: { contains: query, mode: "insensitive" } },
                { equipment_code: { contains: query, mode: "insensitive" } },
                { specification: { contains: query, mode: "insensitive" } },
                {
                  vendor_items: {
                    some: {
                      vendors: {
                        OR: [
                          { vendor_name: { contains: query, mode: "insensitive" } },
                          { vendor_code: { contains: query, mode: "insensitive" } },
                          { country: { contains: query, mode: "insensitive" } },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {},
      ],
    },
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
          design_prices: { orderBy: { price_date: "desc" }, take: 24 },
          execution_prices: { orderBy: { price_date: "desc" }, take: 24 },
        },
      },
    },
    take: 500,
  })

  const rows = equipments.map((equipment) => {
    const vendorItems = equipment.vendor_items
      .map((item) => {
        const evaluation = item.vendors.vendor_evaluations[0]
        const latestDesignPrice = latestActivePrice(item.design_prices)
        const latestExecutionPrice = latestActivePrice(item.execution_prices)

        return {
          vendorItemId: item.vendor_item_id,
          vendorId: item.vendor_id,
          vendorName: item.vendors.vendor_name,
          vendorCode: item.vendors.vendor_code,
          country: item.vendors.country,
          dealerName: item.dealer_name,
          grade: evaluation?.grade ?? null,
          score: evaluation?.total_score ? Number(evaluation.total_score) : null,
          designPrice: latestDesignPrice ? Number(latestDesignPrice.price) : null,
          designCurrency: latestDesignPrice?.currency ?? null,
          designPriceDate: latestDesignPrice?.price_date.toISOString() ?? null,
          executionPrice: latestExecutionPrice
            ? Number(latestExecutionPrice.price)
            : null,
          executionCurrency: latestExecutionPrice?.currency ?? null,
          executionPriceDate:
            latestExecutionPrice?.price_date.toISOString() ?? null,
          designPriceHistory: item.design_prices.map((price) => ({
            id: price.design_price_id,
            type: "설계가" as const,
            vendorId: item.vendor_id,
            vendorName: item.vendors.vendor_name,
            vendorCode: item.vendors.vendor_code,
            amount: Number(price.price),
            currency: price.currency,
            priceDate: price.price_date.toISOString(),
            source: price.source,
            note: price.note,
            isVoided: price.is_voided,
          })),
          executionPriceHistory: item.execution_prices.map((price) => ({
            id: price.execution_price_id,
            type: "실행가" as const,
            vendorId: item.vendor_id,
            vendorName: item.vendors.vendor_name,
            vendorCode: item.vendors.vendor_code,
            amount: Number(price.price),
            currency: price.currency,
            priceDate: price.price_date.toISOString(),
            source: price.source,
            note: price.note,
            isVoided: price.is_voided,
          })),
        }
      })
      .sort((a, b) => {
        if (a.score !== b.score) return (b.score ?? -1) - (a.score ?? -1)
        return (
          (a.designPrice ?? Number.MAX_SAFE_INTEGER) -
          (b.designPrice ?? Number.MAX_SAFE_INTEGER)
        )
      })

    const representative = vendorItems[0]

    return {
      equipment: {
        equipment_id: equipment.equipment_id,
        category_id: equipment.category_id,
        equipment_code: equipment.equipment_code,

        model_name: equipment.model_name,
        manufacturer_model_no: equipment.manufacturer_model_no,
        specification: equipment.specification,
        unit: equipment.unit,
        gwd_equipment_id: equipment.gwd_equipment_id,
        is_active: equipment.is_active,
        notes: equipment.notes,
      },
      category: equipment.equipment_categories?.category_name ?? "-",
      representativeVendor: representative?.vendorName ?? null,
      representativeCountry: representative?.country ?? null,
      designPrice: representative?.designPrice ?? null,
      designCurrency: representative?.designCurrency ?? null,
      executionPrice: representative?.executionPrice ?? null,
      executionCurrency: representative?.executionCurrency ?? null,
      grade: representative?.grade ?? null,
      score: representative?.score ?? null,
      vendorItems,
    }
  }) satisfies EquipmentRow[]

  rows.sort((a, b) => {
    const values: Record<SortKey, [string | number | null, string | number | null]> = {
      category: [a.category, b.category],
      equipment: [
        a.equipment.model_name ?? a.equipment.equipment_code,
        b.equipment.model_name ?? b.equipment.equipment_code,
      ],
      vendor: [a.representativeVendor, b.representativeVendor],
      country: [a.representativeCountry, b.representativeCountry],
      designPrice: [a.designPrice, b.designPrice],
      executionPrice: [a.executionPrice, b.executionPrice],
      grade: [a.grade, b.grade],
    }
    return compareValues(values[activeSort][0], values[activeSort][1], direction)
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
              allLabel="전체 기자재"
              storageKey="vendor-item-db:equipment-category-tree"
            />
          </CardContent>
        </Card>
      </aside>

      <main className="min-w-0 flex-1 space-y-5 overflow-hidden">
        <EquipmentPageHeader
          canManageEquipment={canManageEquipment}
          categories={categories}
          vendors={vendors}
        />

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
                allLabel="전체 기자재"
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
                placeholder="모델명 / 기자재명 / 규격 / 업체명 검색"
                className="max-w-md"
              />
              {selectedCategoryId && (
                <input type="hidden" name="category" value={selectedCategoryId} />
              )}
              <input type="hidden" name="sort" value={activeSort} />
              <input type="hidden" name="dir" value={direction} />
              <Button type="submit">검색</Button>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="showInactive"
                  value="true"
                  defaultChecked={showInactive}
                />
                비활성 포함
              </label>
            </form>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                기자재 목록 {formatCount(rows.length)}
              </CardTitle>
              <EquipmentDownloadButton rows={rows} canViewExecutionPrice={canViewExecutionPrice} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  {canManageEquipment && <TableHead className="w-[40px]" />}
                  <TableHead className="w-[110px]">
                    <SortHeader label="분류" sortKey="category" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  <TableHead className="w-[200px]">
                    <SortHeader label="모델명" sortKey="equipment" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  <TableHead className="w-[200px]">규격/사양</TableHead>
                  <TableHead className="w-[118px] text-right">
                    <SortHeader label="설계가" sortKey="designPrice" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  {canViewExecutionPrice && (
                    <TableHead className="w-[118px] text-right">
                      <SortHeader label="실행가" sortKey="executionPrice" activeSort={activeSort} direction={direction} params={params} />
                    </TableHead>
                  )}
                  <TableHead className="w-[140px]">
                    <SortHeader label="업체" sortKey="vendor" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  <TableHead className="w-[80px]">
                    <SortHeader label="국가" sortKey="country" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  <TableHead className="w-[88px]">
                    <SortHeader label="평가" sortKey="grade" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <EquipmentRows
                  rows={rows}
                  vendors={vendors}
                  categories={categories}
                  canManageEquipment={canManageEquipment}
                  canManagePrices={canManagePrices}
                  canViewExecutionPrice={canViewExecutionPrice}
                />
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={(canViewExecutionPrice ? 8 : 7) + (canManageEquipment ? 1 : 0)}
                      className="h-24 text-center text-muted-foreground"
                    >
                      조회된 기자재가 없습니다.
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
