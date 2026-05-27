"use client"

import { useState } from "react"
import { FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EquipmentManagementSheet } from "@/components/equipment-management-sheet"
import { EquipmentUploadPanel } from "@/components/equipment-upload"

type Category = { category_id: string; category_name: string; parent_category_id: string | null; category_code: string; depth: number; sort_order: number; is_active: boolean }
type Vendor = { vendor_id: string; vendor_code: string; vendor_name: string }

export function EquipmentPageHeader({
  canManageEquipment,
  categories,
  vendors,
}: {
  canManageEquipment: boolean
  categories: Category[]
  vendors: Vendor[]
}) {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">기자재 조회</h1>
          <p className="text-sm text-muted-foreground">
            분류를 좁히고 모델, 규격, 업체와 평가를 확인합니다.
          </p>
        </div>
        {canManageEquipment && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowUpload((v) => !v)}>
              <FileUp size={14} />
              엑셀로 등록
            </Button>
            <EquipmentManagementSheet mode="create" categories={categories} vendors={vendors} />
          </div>
        )}
      </div>

      {showUpload && canManageEquipment && (
        <div className="rounded-md border bg-muted/20 p-4">
          <EquipmentUploadPanel onClose={() => setShowUpload(false)} />
        </div>
      )}
    </div>
  )
}
