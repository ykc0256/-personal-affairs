import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getPermissions } from "@/lib/permissions"
import { ClipboardList, FolderTree, Globe, Shield, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const adminItems = [
  {
    title: "기자재 분류 관리",
    description: "분류 코드·계층 구조를 등록하고 수정합니다. 기자재 추가/검색 시 이 분류 체계가 사용됩니다.",
    href: "/admin/categories",
    icon: FolderTree,
    ready: true,
  },
  {
    title: "평가 기준 관리",
    description: "업체 평가 시 사용할 항목·배점·가중치를 설정합니다.",
    href: "/admin/evaluation-criteria",
    icon: ClipboardList,
    ready: true,
  },
  {
    title: "기본 정보 관리",
    description: "업체 유형(제조사·대리점 등)과 국가 목록을 관리합니다. 업체 등록 시 드롭다운으로 제공됩니다.",
    href: "/admin/references",
    icon: Globe,
    ready: true,
  },
  {
    title: "사용자 관리",
    description: "계정 생성·수정, 비밀번호 초기화, 활성·비활성 전환을 관리합니다.",
    href: "/admin/users",
    icon: Users,
    ready: true,
  },
  {
    title: "역할 관리",
    description: "사용자 역할을 정의하고 세부 권한(관리·조회)을 설정합니다.",
    href: "/admin/roles",
    icon: Shield,
    ready: true,
  },
]

export default async function AdminPage() {
  const session = await auth()
  const perms = getPermissions(session)
  if (!perms.canAccessAdmin) redirect("/")

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">관리</h1>
        <p className="text-sm text-muted-foreground">
          분류 체계 관리, 사용자 관리, 데이터 업로드를 수행합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {adminItems.map((item) => (
          item.ready ? (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-colors hover:bg-gray-50 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {item.description}
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card key={item.href} className="h-full opacity-60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">준비 중</span>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {item.description}
              </CardContent>
            </Card>
          )
        ))}
      </div>
    </div>
  )
}
