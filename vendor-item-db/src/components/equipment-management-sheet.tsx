"use client"

import { useActionState, useState } from "react"
import { PencilLine, Plus, Save } from "lucide-react"
import { createEquipment, updateEquipment } from "@/app/(main)/equipments/actions"
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

type CategoryOption = {
  category_id: string
  category_code: string
  category_name: string
  depth: number
}

type VendorOption = {
  vendor_id: string
  vendor_code: string
  vendor_name: string
}

type EquipmentFormValue = {
  equipment_id?: string
  category_id: string | null
  equipment_code: string
  model_name: string | null
  manufacturer_model_no: string | null
  specification: string | null
  unit: string | null
  gwd_equipment_id: string | null
  notes: string | null
}

export function EquipmentManagementSheet({
  mode,
  categories,
  vendors = [],
  equipment,
  triggerLabel,
  triggerVariant = "default",
}: {
  mode: "create" | "edit"
  categories: CategoryOption[]
  vendors?: VendorOption[]
  equipment?: EquipmentFormValue
  triggerLabel?: string
  triggerVariant?: "default" | "outline"
}) {
  const action = mode === "create" ? createEquipment : updateEquipment
  const [state, formAction, pending] = useActionState(action, {
    ok: false,
    message: "",
  })
  const isCreate = mode === "create"

  const [equipmentCode, setEquipmentCode] = useState(equipment?.equipment_code ?? "")
  const [prevCategoryCode, setPrevCategoryCode] = useState<string | null>(null)

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const categoryId = e.target.value
    const category = categories.find((c) => c.category_id === categoryId)
    const newCode = category?.category_code ?? null

    if (isCreate && newCode) {
      const prevPrefix = prevCategoryCode ? `${prevCategoryCode}-` : ""
      if (equipmentCode === "" || equipmentCode === prevPrefix) {
        setEquipmentCode(`${newCode}-`)
      }
    }

    setPrevCategoryCode(newCode)
  }

  return (
    <Sheet>
      <SheetTrigger
        className={buttonVariants({ variant: triggerVariant, size: "sm" })}
      >
        {isCreate ? <Plus size={15} /> : <PencilIcon />}
        {triggerLabel ?? (isCreate ? "기자재 추가" : "수정")}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isCreate ? "기자재 추가" : "기자재 수정"}</SheetTitle>
          <SheetDescription>
            기자재 마스터 정보를 입력합니다. 가격 이력은 행 상세 영역에서 별도로 관리합니다.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="space-y-4 px-4 pb-4">
          {!isCreate && equipment?.equipment_id && (
            <input type="hidden" name="equipmentId" value={equipment.equipment_id} />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-category`}>분류</Label>
              <select
                id={`${mode}-category`}
                name="categoryId"
                defaultValue={equipment?.category_id ?? ""}
                onChange={handleCategoryChange}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">미지정</option>
                {categories.map((category) => (
                  <option key={category.category_id} value={category.category_id}>
                    {"-".repeat(Math.max(category.depth - 1, 0))}{" "}
                    [{category.category_code}] {category.category_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-equipment-code`}>
                기자재 코드
                {isCreate && prevCategoryCode && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    ({prevCategoryCode}-...)
                  </span>
                )}
              </Label>
              <Input
                id={`${mode}-equipment-code`}
                name="equipmentCode"
                required
                maxLength={30}
                value={equipmentCode}
                onChange={(e) => setEquipmentCode(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-model-name`}>모델명</Label>
              <Input
                id={`${mode}-model-name`}
                name="modelName"
                maxLength={200}
                defaultValue={equipment?.model_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-manufacturer-model-no`}>제조사 모델번호</Label>
              <Input
                id={`${mode}-manufacturer-model-no`}
                name="manufacturerModelNo"
                maxLength={100}
                defaultValue={equipment?.manufacturer_model_no ?? ""}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${mode}-unit`}>단위</Label>
              <Input
                id={`${mode}-unit`}
                name="unit"
                maxLength={20}
                defaultValue={equipment?.unit ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${mode}-gwd-equipment-id`}>GWD ID</Label>
              <Input
                id={`${mode}-gwd-equipment-id`}
                name="gwdEquipmentId"
                maxLength={50}
                defaultValue={equipment?.gwd_equipment_id ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${mode}-specification`}>규격/사양</Label>
            <Input
              id={`${mode}-specification`}
              name="specification"
              defaultValue={equipment?.specification ?? ""}
            />
          </div>

          {isCreate && vendors.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor={`${mode}-vendor`}>
                고정 업체 <span className="text-xs text-muted-foreground">(선택)</span>
              </Label>
              <select
                id={`${mode}-vendor`}
                name="vendorId"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">미지정 (나중에 가격 등록 시 연결)</option>
                {vendors.map((vendor) => (
                  <option key={vendor.vendor_id} value={vendor.vendor_id}>
                    [{vendor.vendor_code}] {vendor.vendor_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                지정하면 해당 업체로 vendor_item이 즉시 생성됩니다.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`${mode}-notes`}>비고</Label>
            <Input
              id={`${mode}-notes`}
              name="notes"
              defaultValue={equipment?.notes ?? ""}
            />
          </div>

          {state.message && (
            <p
              className={cn(
                "text-sm",
                state.ok ? "text-green-700" : "text-destructive"
              )}
            >
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

function PencilIcon() {
  return <PencilLine size={15} />
}
