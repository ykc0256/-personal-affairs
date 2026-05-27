"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState(() =>
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem("vendor-db-username") ?? ""
  )
  const [rememberId, setRememberId] = useState(() =>
    typeof window === "undefined"
      ? false
      : Boolean(window.localStorage.getItem("vendor-db-username"))
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    const usernameValue = String(form.get("username") ?? "")
    const result = await signIn("credentials", {
      username: usernameValue,
      password: form.get("password"),
      redirect: false,
    })

    if (result?.error) {
      setError("아이디 또는 비밀번호가 올바르지 않습니다.")
      setLoading(false)
    } else {
      if (rememberId) {
        window.localStorage.setItem("vendor-db-username", usernameValue)
      } else {
        window.localStorage.removeItem("vendor-db-username")
      }
      router.push("/")
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Vendor Item DB</CardTitle>
          <p className="text-sm text-muted-foreground">
            기자재 가격 관리 시스템
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={rememberId}
                onChange={(event) => setRememberId(event.target.checked)}
              />
              로그인 아이디 저장
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "로그인 중..." : "로그인"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
