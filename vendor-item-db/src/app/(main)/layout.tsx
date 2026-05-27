import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Gnb } from "@/components/layout/gnb"

export const dynamic = "force-dynamic"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as { name?: string; role: string }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Gnb userName={user.name ?? "사용자"} userRole={user.role} />
      <main className="flex-1 w-full px-4 py-5 lg:px-6">{children}</main>
    </div>
  )
}
