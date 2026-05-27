# WAI Design 데이터 연결 구조

분석 기준 프로젝트: `019e3869-09fc-7dbf-965e-b0c7710d10bc` (1s1s1a1s)  
분석일: 2026-05-19

---

## 1. 전체 흐름 개요

```
[사용자 입력]
  공정 선택 (process_masters)
  장비 선택 (equipment_catalog)
  구조물 선택 (structures)
        ↓
[프로젝트 데이터 저장 — DB]
  project_processes / project_equipment_selections / project_structure_selections
        ↓
[계산 엔진 실행 — formula_library]
  공정 계산 → report.json (values, equipments, structures, mass_balance)
  전기 계산 → elec_equip_load_list / elec_power_equip_list / elec_instrument_list
  P&ID 매핑 → process_pid_excel_relations → pid.json (mapping_result)
        ↓
[산출물 생성]
  P&ID SVG    ← wai-drawing-files
  PFD SVG     ← wai-symbols
  전기계산서  ← elec_* DB 테이블 → xlsx (온디맨드 스트림)
  BOQ 내역서  ← DB 전체 + report.json → xlsx (wai-project/result/)
  3D 모델     ← project.json (electric_wires, electrictrays 등)
```

---

## 2. P&ID 연결 구조

### 2-1. 공정 → P&ID 템플릿 매핑

| DB 테이블 | 역할 |
|---|---|
| `process_masters` | 공정 마스터 |
| `process_pid_components` | 공정별 구성요소 코드 → 카탈로그 타입 |
| `process_pid_excel_relations` | DataIn(입력변수) + DataGen(P&ID 심볼코드 → 템플릿변수) 매핑 |

### 2-2. P&ID 산출물

| 산출물 | 저장 위치 |
|---|---|
| P&ID SVG | `wai-drawing-files/{file_id}/{filename}` |
| PFD SVG | `wai-symbols/{uuid}/{filename}` |
| pid.json | `wai-project/{project_id}/pid.json` |

### 2-3. 계측기 연결

`pid.json.data_instrument[]`에서 정의된 계측기 태그 → `elec_instrument_list`에 실제 값으로 저장.

---

## 3. 전기설계 연결 구조

### 3-1. 프로젝트 전기 기준값 (projects 테이블)

| 컬럼 | 역할 |
|---|---|
| `has_substation` | 수변전 설비 유무 → 8-1/8-2 시트 조건부 생성 |
| `building_load_percent` | 건축 부하 비율 (계약전력에 포함) |
| `mcc_rated_current` | MCC 한계 전류 (A) — 사용자 지정, MCC 그룹 분기 기준 |
| `panel_demand_factor` | 분전반 수용율 |

### 3-2. 부하 계산 (elec_equip_load_list)

**계산 공식:**

| 항목 | 공식 |
|---|---|
| 부하용량(kVA) | `ROUND(동력kW ÷ (효율 × 역률), 2)` |
| 정격전류(A) | `동력kW × 1000 ÷ 1.732 ÷ 380 ÷ 효율 ÷ 역률` |
| 상용전류(A) | `정격전류 × 상용수량` |
| MCC 대표 상용전류(A) | `SUM(그룹 내 상용전류) + MAX(그룹 내 상용전류) × 0.1` ✅ |

**ctrl_method 코드 매핑:**

| 코드 | 기동방식 |
|---|---|
| `S_SYS01` | 직입 |
| `S_SYS02` | 인버터 |
| `S_SYS03` | 소프트스타터 |
| `S_SYS04` | MOP |

### 3-3. 케이블/전선관 → BOQ 연결 ✅

**전선 길이:** `std_distance_m × total_quantity`  
**전선관 길이:** `conduit_length_m × normal_quantity` (예비 장비 전선관 미시공)  
**MCC 피더/계측기:** `std_distance_m=30m` 고정

---

## 4. 내역서(BOQ) 연결 구조

| BOQ 시트 | 데이터 출처 |
|---|---|
| 6-1. 기자재내역서(전기) | `elec_power_equip_list` + `elec_instrument_list` + 물가자료(출처컬럼) |
| 6-2. 설치비내역서(전기) | `electric_cable_unit_price` (노무비/경비) |
| 4-2. 기자재내역서(기계) | `project_equipment_selections` + `equipment_catalog` |
| 4-3. 설치비내역서(기계) | `unit_price_list_machinery` 호표 |
| 5-1. 배관공사비 | `report.json.pipe_quantities[]` + `unit_price_list_plumbing` |

---

## 5. MinIO 파일 구조

```
wai-project/{project_id}/
├── report.json          ← 공정 계산 결과 (equipments, tray_quantity, pipe_quantities 등)
├── project.json         ← 3D 레이아웃 (electric_wires, electrictrays 등)
├── pid.json             ← P&ID 매핑 결과
├── result/kr/metric/
│   └── r12_작업완료.xlsx   ← BOQ 최종 산출물
└── template/kr/metric/
    └── r12.xlsx            ← BOQ 템플릿

wai-drawing-files/{file_id}/{filename}  ← P&ID / 전기 도면 SVG
wai-symbols/{uuid}/{filename}           ← PFD SVG 심볼
wai-formula-library/                    ← 공정 계산 Python 스크립트
```

---

## 6. 전기설계 세부 데이터 흐름

```
[기계 카탈로그 선택]
        ↓
[report.json] ── equipments[].EQP.*  ──→ [전기계산서] 동력설비부하계산서
                                              ↓ + DB elec_selection_rules
                                          케이블스케쥴 (전선/전선관 규격)

[project.json] ── electric_wires[].points[].magnitude ──→ [BOQ] 전선/전선관 길이(M)

[report.json] ── tray_quantity ──→ [BOQ] 케이블트레이 수량(EA)  ✅
```

**케이블스케쥴 → BOQ 검증 (1s1s1a1s):**

| BOQ 항목 | 계산 | BOQ 수량 |
|---|---|---|
| F-CV 4SQ 3C | M-101: 28m×2 + M-102: 38m×3 | **170 M** ✅ |
| F-CV 10SQ 4C | MCC 피더: 30m×1 (고정값) | **30 M** ✅ |
| 강제전선관 28mm | M-101: 14m×2 + M-102: 14m×2 | **56 M** ✅ |

---

## 7. 미확인/보완 필요 항목

| # | 항목 | 상태 |
|---|---|---|
| 1 | electric_wires → std_distance_m 변환 로직 | ⚠️ 소스코드 확인 필요 |
| 2 | conduit_length_m 산출 (트레이 구간 제외 로직) | ⚠️ ELEC-4 소스코드 필요 |
| 3 | 계측기 전선관 거리 산출 방식 | ⚠️ ELEC-2 소스코드 필요 |
| 4 | pipe_quantities[] 생성 경로 | ⚠️ BOQ-3 이안 확인 필요 |
| 5 | P&ID DataIn 변수 주입 로직 | ⚠️ 미확인 |
| 6 | SVG 도면 생성 로직 | ⚠️ 소스코드 미입수 |
