import Link from "next/link"
import { auth } from "@/auth"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/format"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertTriangle,
  BookOpen,
  Building2,
  ClipboardCheck,
  FolderTree,
  PackageSearch,
  TrendingUp,
  Unlink,
} from "lucide-react"

type CountRow = { count: bigint | number }
type VendorReviewRow = {
  vendor_id: string
  vendor_name: string
  vendor_code: string
  reason: string
  last_eval_date: Date | null
}
type EquipmentReviewRow = {
  equipment_id: string
  model_name: string | null
  equipment_code: string
  reason: string
  event_date: Date | null
}

function toNumber(value: bigint | number | undefined) {
  return Number(value ?? 0)
}

async function count(sql: TemplateStringsArray) {
  const rows = await prisma.$queryRaw<CountRow[]>(sql)
  return toNumber(rows[0]?.count)
}

async function getDashboardData() {
  const [
    totalEquipmentCount,
    totalVendorCount,
    missingCategoryCount,
    missingVendorCount,
    missingEvaluationCount,
    staleEvaluationCount,
    missingPriceCount,
    recentPriceChangeCount,
    missingSourcePriceCount,
    vendorsToReview,
    equipmentsToReview,
  ] = await Promise.all([
    count`select count(*)::bigint from equipments where is_active = true`,
    count`select count(*)::bigint from vendors where is_active = true`,
    count`select count(*)::bigint
          from equipments e
          where e.is_active = true
            and e.category_id is null`,
    count`select count(*)::bigint
          from equipments e
          where e.is_active = true
            and not exists (
              select 1 from vendor_items vi
              where vi.equipment_id = e.equipment_id
                and vi.is_active = true
            )`,
    count`select count(*)::bigint
          from vendors v
          where v.is_active = true
            and not exists (
              select 1 from vendor_evaluations ve
              where ve.vendor_id = v.vendor_id
            )`,
    count`with latest as (
            select v.vendor_id, max(ve.evaluation_date) as last_eval_date
            from vendors v
            join vendor_evaluations ve on ve.vendor_id = v.vendor_id
            where v.is_active = true
            group by v.vendor_id
          )
          select count(*)::bigint
          from latest
          where last_eval_date < current_date - interval '180 days'`,
    count`select count(*)::bigint
          from equipments e
          where e.is_active = true
            and exists (
              select 1 from vendor_items vi
              where vi.equipment_id = e.equipment_id and vi.is_active = true
            )
            and not exists (
              select 1 from design_prices dp
              where dp.equipment_id = e.equipment_id
                and coalesce(dp.is_voided, false) = false
            )`,
    count`select count(*)::bigint
          from design_prices dp
          where dp.created_at >= now() - interval '30 days'
            and coalesce(dp.is_voided, false) = false`,
    count`select count(*)::bigint
          from design_prices dp
          where coalesce(dp.is_voided, false) = false
            and (dp.source is null or btrim(dp.source) = '')`,
    prisma.$queryRaw<VendorReviewRow[]>`
      with latest as (
        select
          v.vendor_id,
          v.vendor_name,
          v.vendor_code,
          max(ve.evaluation_date) as last_eval_date
        from vendors v
        left join vendor_evaluations ve on ve.vendor_id = v.vendor_id
        where v.is_active = true
        group by v.vendor_id, v.vendor_name, v.vendor_code
      )
      select
        vendor_id,
        vendor_name,
        vendor_code,
        case
          when last_eval_date is null then '평가 없음'
          else '평가 오래됨'
        end as reason,
        last_eval_date
      from latest
      where last_eval_date is null
         or last_eval_date < current_date - interval '180 days'
      order by last_eval_date nulls first, vendor_name
      limit 5
    `,
    prisma.$queryRaw<EquipmentReviewRow[]>`
      select *
      from (
        select
          e.equipment_id,
          e.model_name,
          e.equipment_code,
          '업체 미연결' as reason,
          null::date as event_date
        from equipments e
        where e.is_active = true
          and not exists (
            select 1 from vendor_items vi
            where vi.equipment_id = e.equipment_id and vi.is_active = true
          )

        union all

        select
          e.equipment_id,
          e.model_name,
          e.equipment_code,
          '분류 미지정' as reason,
          null::date as event_date
        from equipments e
        where e.is_active = true
          and e.category_id is null
          and exists (
            select 1 from vendor_items vi
            where vi.equipment_id = e.equipment_id and vi.is_active = true
          )

        union all

        select
          e.equipment_id,
          e.model_name,
          e.equipment_code,
          '가격 없음' as reason,
          null::date as event_date
        from equipments e
        where e.is_active = true
          and e.category_id is not null
          and exists (
            select 1 from vendor_items vi
            where vi.equipment_id = e.equipment_id and vi.is_active = true
          )
          and not exists (
            select 1 from design_prices dp
            where dp.equipment_id = e.equipment_id
              and coalesce(dp.is_voided, false) = false
          )

        union all

        select *
        from (
          select distinct on (e.equipment_id)
            e.equipment_id,
            e.model_name,
            e.equipment_code,
            '출처 없음' as reason,
            dp.price_date as event_date
          from equipments e
          join design_prices dp on dp.equipment_id = e.equipment_id
          where e.is_active = true
            and coalesce(dp.is_voided, false) = false
            and (dp.source is null or btrim(dp.source) = '')
          order by e.equipment_id, dp.price_date desc
        ) missing_source
      ) issues
      order by
        case reason
          when '업체 미연결' then 0
          when '분류 미지정' then 1
          when '가격 없음'   then 2
          else 3
        end,
        event_date nulls first,
        model_name
      limit 8
    `,
  ])

  return {
    totalEquipmentCount,
    totalVendorCount,
    missingCategoryCount,
    missingVendorCount,
    missingEvaluationCount,
    staleEvaluationCount,
    missingPriceCount,
    recentPriceChangeCount,
    missingSourcePriceCount,
    vendorsToReview,
    equipmentsToReview,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  const { canManageEquipment: isAdmin, canManagePrices: canManage } = getPermissions(session)

  const data = await getDashboardData()

  const statCards = [
    {
      title: "전체 기자재",
      value: `${data.totalEquipmentCount.toLocaleString("ko-KR")}개`,
      sub: `분류 미지정 ${data.missingCategoryCount.toLocaleString("ko-KR")}개`,
      icon: BookOpen,
      href: "/equipments",
      alert: data.missingCategoryCount > 0,
    },
    {
      title: "전체 업체",
      value: `${data.totalVendorCount.toLocaleString("ko-KR")}개`,
      sub: `평가 미등록 ${data.missingEvaluationCount.toLocaleString("ko-KR")}개`,
      icon: Building2,
      href: "/vendors",
      alert: data.missingEvaluationCount > 0,
    },
    {
      title: "업체 미연결",
      value: `${data.missingVendorCount.toLocaleString("ko-KR")}개`,
      sub: "기자재",
      icon: Unlink,
      href: "/equipments",
      alert: data.missingVendorCount > 0,
    },
    {
      title: "최근 가격 변경",
      value: `${data.recentPriceChangeCount.toLocaleString("ko-KR")}건`,
      sub: "최근 30일",
      icon: TrendingUp,
      href: "/prices",
      alert: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">대시보드</h1>
          <p className="text-sm text-muted-foreground">
            데이터 현황과 처리 필요 항목을 확인합니다.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
              >
                <FolderTree size={14} />
                분류 관리
              </Link>
            )}
            <Link
              href="/vendors"
              className="inline-flex items-center gap-1.5 rounded-md border bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
            >
              <Building2 size={14} />
              업체 등록
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="transition-colors hover:bg-gray-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon
                  className={`h-4 w-4 ${card.alert ? "text-amber-500" : "text-muted-foreground"}`}
                />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.alert ? "text-amber-600" : ""}`}>
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <ClipboardCheck size={14} />
              처리 필요 업체
            </CardTitle>
            <Link href="/evaluations" className="text-xs text-muted-foreground hover:underline">
              평가 관리 →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.vendorsToReview.map((vendor) => (
                <div key={vendor.vendor_id} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/vendors?q=${encodeURIComponent(vendor.vendor_name)}`}
                      className="font-medium truncate hover:underline"
                    >
                      {vendor.vendor_name}
                    </Link>
                    <span className="text-xs text-amber-700 shrink-0 rounded-full bg-amber-50 px-2 py-0.5">
                      {vendor.reason}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vendor.vendor_code} · 최근 평가 {formatDate(vendor.last_eval_date)}
                  </div>
                </div>
              ))}
              {data.vendorsToReview.length === 0 && (
                <div className="text-sm text-muted-foreground">처리할 항목이 없습니다.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <PackageSearch size={14} />
              처리 필요 기자재
            </CardTitle>
            <Link href="/equipments" className="text-xs text-muted-foreground hover:underline">
              기자재 목록 →
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.equipmentsToReview.map((equipment) => (
                <div key={`${equipment.equipment_id}-${equipment.reason}`} className="text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      href={`/equipments?q=${encodeURIComponent(equipment.equipment_code)}`}
                      className="font-medium truncate hover:underline"
                    >
                      {equipment.model_name ?? equipment.equipment_code}
                    </Link>
                    <span className={`text-xs shrink-0 rounded-full px-2 py-0.5 ${
                      equipment.reason === "업체 미연결"
                        ? "bg-red-50 text-red-700"
                        : equipment.reason === "분류 미지정"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {equipment.reason}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {equipment.equipment_code}
                    {equipment.event_date && ` · 기준일 ${formatDate(equipment.event_date)}`}
                  </div>
                </div>
              ))}
              {data.equipmentsToReview.length === 0 && (
                <div className="text-sm text-muted-foreground">처리할 항목이 없습니다.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">데이터 상태 요약</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">업체 미연결 기자재</span>
                <span className={`font-medium ${data.missingVendorCount > 0 ? "text-red-600" : ""}`}>
                  {data.missingVendorCount.toLocaleString("ko-KR")}개
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">분류 미지정 기자재</span>
                <span className={`font-medium ${data.missingCategoryCount > 0 ? "text-purple-600" : ""}`}>
                  {data.missingCategoryCount.toLocaleString("ko-KR")}개
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">가격 미등록 기자재</span>
                <span className={`font-medium ${data.missingPriceCount > 0 ? "text-amber-600" : ""}`}>
                  {data.missingPriceCount.toLocaleString("ko-KR")}개
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">평가 오래된 업체</span>
                <span className={`font-medium ${data.staleEvaluationCount > 0 ? "text-amber-600" : ""}`}>
                  {data.staleEvaluationCount.toLocaleString("ko-KR")}개
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">출처 없는 가격</span>
                <span className={`font-medium ${data.missingSourcePriceCount > 0 ? "text-amber-600" : ""}`}>
                  {data.missingSourcePriceCount.toLocaleString("ko-KR")}건
                </span>
              </div>
              {isAdmin && (
                <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                  기자재 분류 및 업체 연결은{" "}
                  <Link href="/equipments" className="underline">
                    기자재 조회
                  </Link>
                  에서 수정할 수 있습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
