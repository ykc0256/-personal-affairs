"use client"

import { useState } from "react"
import { FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VendorManagementSheet } from "@/components/vendor-management-sheet"
import { VendorUploadPanel } from "@/components/vendor-upload"

export function VendorPageHeader({
  canManage,
  vendorTypes = [],
  countries = [],
}: {
  canManage: boolean
  vendorTypes?: string[]
  countries?: string[]
}) {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">업체 조회</h1>
          <p className="text-sm text-muted-foreground">
            분류를 좁히고 해당 기자재를 취급하는 업체를 확인합니다.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowUpload((v) => !v)}>
              <FileUp size={14} />
              엑셀로 등록
            </Button>
            <VendorManagementSheet mode="create" vendorTypes={vendorTypes} countries={countries} />
          </div>
        )}
      </div>

      {showUpload && canManage && (
        <div className="rounded-md border bg-muted/20 p-4">
          <VendorUploadPanel onClose={() => setShowUpload(false)} />
        </div>
      )}
    </div>
  )
}
