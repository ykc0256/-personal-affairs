import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { ReferencesManagementPanel } from "./references-management"

export default async function ReferencesPage() {
  const session = await auth()
  const perms = getPermissions(session)
  if (!perms.canAccessAdmin) redirect("/")

  const [rawTypes, rawCountries] = await Promise.all([
    prisma.vendor_types.findMany({ orderBy: [{ sort_order: "asc" }, { type_name: "asc" }] }),
    prisma.countries.findMany({ orderBy: [{ sort_order: "asc" }, { country_name: "asc" }] }),
  ])

  const vendorTypes = rawTypes.map((t) => ({
    id: t.type_id,
    name: t.type_name,
    sort_order: t.sort_order,
    is_active: t.is_active,
  }))

  const countries = rawCountries.map((c) => ({
    id: c.country_id,
    name: c.country_name,
    sort_order: c.sort_order,
    is_active: c.is_active,
  }))

  const isEmpty = vendorTypes.length === 0 && countries.length === 0

  return (
    <div className="space-y-5">
      <div>
        <nav className="text-sm text-muted-foreground mb-1">
          <a href="/admin" className="hover:underline">관리</a>
          {" / "}
          <span>기본 정보</span>
        </nav>
        <h1 className="text-xl font-semibold">기본 정보 관리</h1>
        <p className="text-sm text-muted-foreground">
          업체 등록 시 사용할 유형과 국가 목록을 관리합니다.
        </p>
      </div>

      <ReferencesManagementPanel
        vendorTypes={vendorTypes}
        countries={countries}
        isEmpty={isEmpty}
      />
    </div>
  )
}
