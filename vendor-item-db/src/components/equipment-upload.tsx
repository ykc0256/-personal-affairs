"use client"

import { useActionState } from "react"
import { Download, FileSpreadsheet, Upload, X } from "lucide-react"
import { uploadEquipmentsExcel, type EquipmentUploadResult } from "@/app/(main)/equipments/equipment-upload-actions"
import { Button } from "@/components/ui/button"

const INITIAL: EquipmentUploadResult = { ok: false, message: "", created: 0, updated: 0, errors: [] }

function downloadTemplate() {
  const BOM = "﻿"
  const header = "기자재코드,모델명,제조사모델번호,규격/사양,단위,분류코드,업체코드,비고"
  const samples = [
    "TR-1000KVA,TM-1000,MOL-1000KVA,1000kVA 22.9kV/380V 60Hz,EA,ELECT_TR,VEN-001,",
    "SW-ACB-630,NAS-630,ACB-630A,630A 3P AC 380V,EA,ELECT_SW,,",
    "CAB-TRAY-100,CT-100,,W100×H50mm 2M,EA,,,",
  ]
  const csv = BOM + [header, ...samples].join("\r\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "equipment_template.csv"
  a.click()
  URL.revokeObjectURL(url)
}

export function EquipmentUploadPanel({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(uploadEquipmentsExcel, INITIAL)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Excel 또는 CSV 파일로 기자재를 일괄 등록합니다. 기존 코드가 있으면 업데이트됩니다.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 hover:bg-black/10 transition-colors"
        >
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* 열 구성 안내 */}
      <div className="rounded-md border bg-muted/40 px-3 py-2.5 text-xs space-y-1.5">
        <div className="font-medium text-foreground mb-1">엑셀 열 구성</div>
        {[
          ["A", "기자재코드", "필수. 영대문자·숫자·- 조합 (예: TR-1000KVA)"],
          ["B", "모델명", "선택 (예: TM-1000)"],
          ["C", "제조사모델번호", "선택"],
          ["D", "규격/사양", "선택 (예: 1000kVA 22.9kV/380V)"],
          ["E", "단위", "선택 (예: EA, M, SET)"],
          ["F", "분류코드", "선택. 관리 → 기자재 분류의 코드값 입력"],
          ["G", "업체코드", "선택. 업체의 코드값 입력 시 자동 연결"],
          ["H", "비고", "선택"],
        ].map(([col, name, desc]) => (
          <div key={col} className="flex items-start gap-2">
            <code className="shrink-0 rounded bg-black/5 px-1 font-mono">{col}</code>
            <span className="font-medium shrink-0">{name}</span>
            <span className="text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5" type="button">
        <Download size={14} />
        양식 다운로드 (CSV)
      </Button>

      <form action={formAction} className="space-y-3">
        <label
          htmlFor="equipment-upload-file"
          className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
        >
          <FileSpreadsheet size={16} className="shrink-0" />
          <span>클릭하여 파일 선택 (.xlsx, .xls, .csv)</span>
        </label>
        <input
          id="equipment-upload-file"
          name="file"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const label = e.currentTarget.closest("form")?.querySelector("label span")
            if (label && e.currentTarget.files?.[0]) {
              label.textContent = e.currentTarget.files[0].name
            }
          }}
        />

        <Button type="submit" disabled={pending} className="w-full gap-1.5">
          <Upload size={14} />
          {pending ? "업로드 중..." : "업로드"}
        </Button>
      </form>

      {state.message && (
        <div className={`rounded-md border px-3 py-2.5 text-sm space-y-2 ${
          state.ok
            ? "border-green-200 bg-green-50 text-green-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          <p className="font-medium">{state.message}</p>

          {state.ok && (state.created > 0 || state.updated > 0) && (
            <div className="flex gap-4 text-xs">
              <span>신규 추가: <strong>{state.created}</strong>개</span>
              <span>업데이트: <strong>{state.updated}</strong>개</span>
            </div>
          )}

          {state.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">오류 목록 ({state.errors.length}건)</p>
              <div className="max-h-48 overflow-y-auto rounded border bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-2 py-1 text-left font-medium w-12">행</th>
                      <th className="px-2 py-1 text-left font-medium w-36">코드</th>
                      <th className="px-2 py-1 text-left font-medium">오류 내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.errors.map((err, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-2 py-1 text-muted-foreground">{err.row}</td>
                        <td className="px-2 py-1 font-mono">{err.code}</td>
                        <td className="px-2 py-1 text-red-700">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
