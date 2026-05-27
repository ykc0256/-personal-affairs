"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { signOut } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  procurement: "구매",
  engineer: "설계",
  viewer: "조회",
}

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  procurement: "bg-blue-100 text-blue-700",
  engineer: "bg-green-100 text-green-700",
  viewer: "bg-gray-100 text-gray-700",
}

interface GnbProps {
  userName: string
  userRole: string
}

export function Gnb({ userName, userRole }: GnbProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedCategoryId = searchParams.get("category")

  const withCategory = (href: string) => {
    if (!selectedCategoryId) return href
    if (href !== "/equipments" && href !== "/vendors") return href
    return `${href}?category=${encodeURIComponent(selectedCategoryId)}`
  }

  const navItems = [
    { href: "/", label: "대시보드" },
    { href: "/equipments", label: "기자재" },
    { href: "/vendors", label: "업체·평가" },
    ...(userRole === "admin" || userRole === "procurement"
      ? [{ href: "/admin", label: "관리" }]
      : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="flex h-14 items-center px-6 gap-6">
        <Link href="/" className="font-semibold text-sm shrink-0">
          Vendor DB
        </Link>

        <nav className="flex items-center gap-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={withCategory(item.href)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                (item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href))
                  ? "bg-gray-100 font-medium text-gray-900"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-xs", ROLE_COLORS[userRole])}
          >
            {ROLE_LABELS[userRole] ?? userRole}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100 cursor-pointer">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-gray-200">
                  {userName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <div className="px-2 py-1.5 text-sm font-medium">{userName}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                로그아웃
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
