"use client"

import { useActionState } from "react"
import { PencilLine, Plus, Save } from "lucide-react"
import { createVendor, updateVendor } from "@/app/(main)/vendors/actions"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const FALLBACK_TYPES = ["제조사", "대리점", "시공사", "수입사", "기타"]

type VendorFormValue = {
  vendor_id?: string
  vendor_code: string
  vendor_name: string
  vendor_type: string | null
  country: string | null
  business_no: string | null
  financial_grade: string | null
  revenue_base_year: number | null
  notes: string | null
}

export function VendorManagementSheet({
  mode,
  vendor,
  triggerLabel,
  triggerVariant = "default",
  vendorTypes = [],
  countries = [],
}: {
  mode: "create" | "edit"
  vendor?: VendorFormValue
  triggerLabel?: string
  triggerVariant?: "default" | "outline" | "ghost"
  vendorTypes?: string[]
  countries?: string[]
}) {
  const action = mode === "create" ? createVendor : updateVendor
  const [state, formAction, pending] = useActionState(action, { ok: false, message: "" })
  const isCreate = mode === "create"
  const typeOptions = vendorTypes.length > 0 ? vendorTypes : FALLBACK_TYPES
  const countryOptions = countries

  return (
    <Sheet>
      <SheetTrigger className={buttonVariants({ variant: triggerVariant, size: "sm" })}>
        {isCreate ? <Plus size={15} /> : <PencilLine size={15} />}
        {triggerLabel ?? (isCreate ? "업체 등록" : "수정")}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isCreate ? "업체 등록" : "업체 수정"}</SheetTitle>
          <SheetDescription>
            업체 기본 정보를 입력합니다.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="space-y-4 px-4 pb-4">
          {!isCreate && vendor?.vendor_id && (
            <input type="hidden" name="vendorId" value={vendor.vendor_id} />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-vendor-name`}>업체명</Label>
              <Input
                id={`${mode}-vendor-name`}
                name="vendorName"
                required
                maxLength={200}
                defaultValue={vendor?.vendor_name ?? ""}
                placeholder="예: 한국전기산업(주)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-vendor-code`}>
                업체 코드
                <span className="ml-1.5 text-xs text-muted-foreground">(영대문자·숫자·_)</span>
              </Label>
              <Input
                id={`${mode}-vendor-code`}
                name="vendorCode"
                required
                maxLength={20}
                defaultValue={vendor?.vendor_code ?? ""}
                placeholder="예: KEC_KR"
                className="font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-vendor-type`}>유형</Label>
              <select
                id={`${mode}-vendor-type`}
                name="vendorType"
                defaultValue={vendor?.vendor_type ?? ""}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">미지정</option>
                {typeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-country`}>국가</Label>
              {countryOptions.length > 0 ? (
                <select
                  id={`${mode}-country`}
                  name="country"
                  defaultValue={vendor?.country ?? ""}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">미지정</option>
                  {countryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`${mode}-country`}
                  name="country"
                  maxLength={50}
                  defaultValue={vendor?.country ?? ""}
                  placeholder="예: 대한민국, 독일, 미국"
                />
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-business-no`}>사업자번호</Label>
              <Input
                id={`${mode}-business-no`}
                name="businessNo"
                maxLength={20}
                defaultValue={vendor?.business_no ?? ""}
                placeholder="예: 123-45-67890"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-financial-grade`}>재무등급</Label>
              <Input
                id={`${mode}-financial-grade`}
                name="financialGrade"
                maxLength={20}
                defaultValue={vendor?.financial_grade ?? ""}
                placeholder="예: A, B+, 우량"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-revenue-base-year`}>매출 기준연도</Label>
            <Input
              id={`${mode}-revenue-base-year`}
              name="revenueBaseYear"
              type="number"
              min={2000}
              max={2099}
              defaultValue={vendor?.revenue_base_year ?? ""}
              placeholder="예: 2024"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-notes`}>비고</Label>
            <Input
              id={`${mode}-notes`}
              name="notes"
              defaultValue={vendor?.notes ?? ""}
            />
          </div>

          {state.message && (
            <p className={cn("text-sm", state.ok ? "text-green-700" : "text-destructive")}>
              {state.message}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            <Save size={15} />
            {pending ? "저장 중..." : "저장"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
