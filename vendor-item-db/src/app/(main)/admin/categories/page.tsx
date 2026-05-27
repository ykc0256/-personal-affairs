import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPermissions } from "@/lib/permissions"
import { prisma } from "@/lib/prisma"
import { flattenCategories } from "@/lib/category"
import { CategoryManagementPanel } from "./category-management"

export default async function CategoriesPage() {
  const session = await auth()
  const perms = getPermissions(session)
  if (!perms.canManageCategories) redirect("/")

  const categories = await prisma.equipment_categories.findMany({
    orderBy: [{ depth: "asc" }, { sort_order: "asc" }, { category_name: "asc" }],
    include: { _count: { select: { equipments: true } } },
  })

  const flat = flattenCategories(categories).map((cat) => ({
    category_id: cat.category_id,
    parent_category_id: cat.parent_category_id,
    category_code: cat.category_code,
    category_name: cat.category_name,
    depth: cat.depth,
    sort_order: cat.sort_order,
    is_active: cat.is_active,
    equipment_count: cat._count.equipments,
  }))

  return (
    <div className="space-y-5">
      <div>
        <nav className="text-sm text-muted-foreground mb-1">
          <a href="/admin" className="hover:underline">관리</a>
          {" / "}
          <span>기자재 분류</span>
        </nav>
        <h1 className="text-xl font-semibold">기자재 분류 관리</h1>
        <p className="text-sm text-muted-foreground">
          총 {categories.length}개 분류 · 활성 {categories.filter((c) => c.is_active).length}개
        </p>
      </div>

      <CategoryManagementPanel categories={flat} />
    </div>
  )
}
