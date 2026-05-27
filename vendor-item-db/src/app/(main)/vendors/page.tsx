import Link from "next/link"
import { auth } from "@/auth"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { compareValues, filterEffectivelyActive, getCategoryDescendantIds } from "@/lib/category"
import { formatCount } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CategoryTree } from "@/components/category-tree"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { VendorPageHeader } from "@/components/vendor-page-header"
import { VendorDownloadButton, VendorRows, type VendorRow, type CriteriaOption } from "@/components/vendor-rows"

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

type SortKey = "vendor" | "type" | "country" | "financialGrade" | "grade"

function textParam(params: Record<string, string | string[] | undefined>, key: string) {
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
  return query ? `/vendors?${query}` : "/vendors"
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
  const nextDirection = activeSort === sortKey && direction === "asc" ? "desc" : "asc"
  const marker = activeSort === sortKey ? (direction === "asc" ? " ▲" : " ▼") : ""
  return (
    <Link href={makeHref(params, { sort: sortKey, dir: nextDirection })} className="inline-flex items-center hover:underline">
      {label}{marker}
    </Link>
  )
}

export default async function VendorsPage({ searchParams }: PageProps) {
  const session = await auth()
  const { canManageVendors: canManage, canViewExecutionPrice } = getPermissions(session)

  const params = (await searchParams) ?? {}
  const query = textParam(params, "q")?.trim()
  const selectedCategoryId = textParam(params, "category")
  const activeSort = (textParam(params, "sort") ?? "vendor") as SortKey
  const direction = textParam(params, "dir") === "desc" ? "desc" : "asc"
  const showInactive = textParam(params, "showInactive") === "true"

  const [activeCriteriaRaw, vendorTypeRows, countryRows] = await Promise.all([
    prisma.evaluation_criteria.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { criteria_name: "asc" }],
      select: { criteria_id: true, criteria_name: true, max_score: true, weight: true, description: true },
    }),
    prisma.vendor_types.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { type_name: "asc" }],
      select: { type_name: true },
    }),
    prisma.countries.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: "asc" }, { country_name: "asc" }],
      select: { country_name: true },
    }),
  ])

  const activeCriteria: CriteriaOption[] = activeCriteriaRaw.map(
    (c) => ({ ...c, weight: c.weight ? Number(c.weight) : null })
  )
  const vendorTypeOptions = vendorTypeRows.map((t) => t.type_name)
  const countryOptions = countryRows.map((c) => c.country_name)

  const categories = filterEffectivelyActive(
    await prisma.equipment_categories.findMany({
      where: { is_active: true },
      orderBy: [{ depth: "asc" }, { sort_order: "asc" }, { category_name: "asc" }],
    })
  )
  const categoryHrefs = Object.fromEntries(
    categories.map((c) => [c.category_id, makeHref(params, { category: c.category_id })])
  )
  const categoryIds = getCategoryDescendantIds(categories, selectedCategoryId)

  const vendors = await prisma.vendors.findMany({
    where: {
      ...(showInactive ? {} : { is_active: true }),
      ...(categoryIds
        ? { vendor_items: { some: { is_active: true, equipments: { category_id: { in: categoryIds } } } } }
        : {}),
      ...(query
        ? {
            OR: [
              { vendor_name: { contains: query, mode: "insensitive" } },
              { vendor_code: { contains: query, mode: "insensitive" } },
              {
                vendor_items: {
                  some: {
                    equipments: {
                      OR: [
                        { model_name: { contains: query, mode: "insensitive" } },
                        { equipment_code: { contains: query, mode: "insensitive" } },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      vendor_items: {
        where: {
          is_active: true,
          ...(categoryIds ? { equipments: { category_id: { in: categoryIds } } } : {}),
        },
        include: {
          equipments: { include: { equipment_categories: true } },
          design_prices: { where: { is_voided: false }, orderBy: { price_date: "desc" }, take: 1 },
          execution_prices: { where: { is_voided: false }, orderBy: { price_date: "desc" }, take: 1 },
        },
      },
      vendor_evaluations: {
        orderBy: [{ evaluation_date: "desc" }, { created_at: "desc" }],
        take: 10,
        include: {
          users_vendor_evaluations_evaluator_idTousers: {
            select: { display_name: true, username: true },
          },
          evaluation_scores: {
            include: {
              evaluation_criteria: { select: { criteria_name: true, max_score: true } },
            },
            orderBy: { evaluation_criteria: { sort_order: "asc" } },
          },
        },
      },
    },
    take: 500,
  })

  const rows: VendorRow[] = vendors
    .map((v) => {
      const latestEval = v.vendor_evaluations[0]
      return {
        vendor_id: v.vendor_id,
        vendor_code: v.vendor_code,
        vendor_name: v.vendor_name,
        vendor_type: v.vendor_type,
        country: v.country,
        business_no: v.business_no,
        financial_grade: v.financial_grade,
        revenue_base_year: v.revenue_base_year,
        is_active: v.is_active,
        notes: v.notes,
        gwd_vendor_id: v.gwd_vendor_id,
        equipment_count: v.vendor_items.length,
        latest_evaluation: latestEval
          ? {
              evaluation_id: latestEval.evaluation_id,
              evaluation_date: latestEval.evaluation_date.toISOString(),
              grade: latestEval.grade,
              total_score: latestEval.total_score ? Number(latestEval.total_score) : null,
              evaluator_name:
                latestEval.users_vendor_evaluations_evaluator_idTousers?.display_name ??
                latestEval.users_vendor_evaluations_evaluator_idTousers?.username ??
                null,
              notes: latestEval.notes,
              scores: latestEval.evaluation_scores.map((s) => ({
                criteria_name: s.evaluation_criteria.criteria_name,
                max_score: s.evaluation_criteria.max_score,
                score: Number(s.score),
              })),
            }
          : null,
        evaluations: v.vendor_evaluations.map((ev) => ({
          evaluation_id: ev.evaluation_id,
          evaluation_date: ev.evaluation_date.toISOString(),
          grade: ev.grade,
          total_score: ev.total_score ? Number(ev.total_score) : null,
          evaluator_name:
            ev.users_vendor_evaluations_evaluator_idTousers?.display_name ??
            ev.users_vendor_evaluations_evaluator_idTousers?.username ??
            null,
          notes: ev.notes,
          scores: ev.evaluation_scores.map((s) => ({
            criteria_name: s.evaluation_criteria.criteria_name,
            max_score: s.evaluation_criteria.max_score,
            score: Number(s.score),
          })),
        })),
        items: v.vendor_items.map((item) => ({
          vendor_item_id: item.vendor_item_id,
          equipment_id: item.equipment_id,
          equipment_code: item.equipments.equipment_code,
          model_name: item.equipments.model_name ?? null,
          category_name: item.equipments.equipment_categories?.category_name ?? null,
          specification: item.equipments.specification,
          latest_design_price: item.design_prices[0] ? Number(item.design_prices[0].price) : null,
          latest_design_price_date: item.design_prices[0]?.price_date.toISOString() ?? null,
          latest_execution_price: item.execution_prices[0] ? Number(item.execution_prices[0].price) : null,
        })),
      }
    })
    .sort((a, b) => {
      const values: Record<SortKey, [string | number | null, string | number | null]> = {
        vendor: [a.vendor_name, b.vendor_name],
        type: [a.vendor_type, b.vendor_type],
        country: [a.country, b.country],
        financialGrade: [a.financial_grade, b.financial_grade],
        grade: [a.latest_evaluation?.grade ?? null, b.latest_evaluation?.grade ?? null],
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
              allLabel="전체 업체"
              storageKey="vendor-item-db:equipment-category-tree"
            />
          </CardContent>
        </Card>
      </aside>

      <main className="min-w-0 flex-1 space-y-5 overflow-hidden">
        <VendorPageHeader canManage={canManage} vendorTypes={vendorTypeOptions} countries={countryOptions} />

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
                allLabel="전체 업체"
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
                placeholder="업체명 / 코드 / 취급 기자재 검색"
                className="max-w-md"
              />
              {selectedCategoryId && <input type="hidden" name="category" value={selectedCategoryId} />}
              <input type="hidden" name="sort" value={activeSort} />
              <input type="hidden" name="dir" value={direction} />
              <Button type="submit">검색</Button>
              {canManage && (
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                  <input type="checkbox" name="showInactive" value="true" defaultChecked={showInactive} />
                  비활성 포함
                </label>
              )}
            </form>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                업체 목록 {formatCount(rows.length)}
              </CardTitle>
              <VendorDownloadButton rows={rows} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>
                    <SortHeader label="업체" sortKey="vendor" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  <TableHead className="w-[90px]">
                    <SortHeader label="유형" sortKey="type" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <SortHeader label="국가" sortKey="country" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  <TableHead className="w-[90px]">
                    <SortHeader label="재무등급" sortKey="financialGrade" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  <TableHead className="w-[70px] text-center">기자재</TableHead>
                  <TableHead className="w-[120px]">
                    <SortHeader label="최근 평가" sortKey="grade" activeSort={activeSort} direction={direction} params={params} />
                  </TableHead>
                  {canManage && <TableHead className="w-[140px] text-right">관리</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <VendorRows
                  rows={rows}
                  canManage={canManage}
                  canViewExecutionPrice={canViewExecutionPrice}
                  criteria={activeCriteria}
                  vendorTypes={vendorTypeOptions}
                  countries={countryOptions}
                />
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={canManage ? 8 : 7} className="h-24 text-center text-muted-foreground">
                      조회된 업체가 없습니다.
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
