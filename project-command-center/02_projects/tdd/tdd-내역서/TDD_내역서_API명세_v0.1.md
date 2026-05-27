# 내역서(BOQ) DB/MinIO 연결 명세 v0.1

작성일: 2026-05-22  
DB 스키마: `bkt_wai_design`  
샘플 프로젝트 ID: `019e4d2e-dc83-7154-b1fe-f647b35dbcac` (GWD)

마커 규칙:
- ✅ DB/MinIO 직접 조회로 확인된 항목
- ⚠️ 방향은 확인됐으나 세부 구현은 소스코드 확인 필요
- ❓ 아직 확인 안 됨

---

## 1. 전체 데이터 흐름

```
[MinIO] wai-project/{project_id}/template/kr/metric/r12.xlsx
  └─ BOQ 출력 템플릿 (19~21개 시트 포함)

[DB] project_equipment_selections × equipment_catalog
  └─ 기계 기자재 수량·재료비·호표 매핑

[DB] elec_power_equip_list + elec_instrument_list
  └─ 전선·전선관·트레이·단자·MCC/LOP 수량

[DB] elec_*_spec 테이블들
  └─ conduit_fitting / cable_tray / electric_control / compression_copper_terminal
  └─ 파생 품목 수량 결정

[DB] unit_price_list_machinery / unit_price_list_plumbing / electric_cable_unit_price
  └─ 호표 기반 노무비·경비 단가

[DB] project_structure_selections × structures
  └─ 토목 구조물 치수 (사용자 지정)

[API] GET /api/v1/projects/{project_id}/report → report.json
  └─ pipe_quantities[]     → 배관 BOQ
  └─ building_structures[] → 건축 연면적
  └─ OPX.{type}_{n}       → 유지관리비 수량 (약품·슬러지)

[DB] maintenance_cost
  └─ 토목·건축·유지관리 단가 (code_name 키 기반)

    ↓ BOQ 수량·금액 산출 ↓

[MinIO] wai-project/{project_id}/result/kr/metric/r12_작업완료.xlsx
  └─ 완성된 BOQ Excel 저장
```

---

## 2. DB 테이블 상세

### 2.1 project_equipment_selections — 기계 장비 선택

**역할**: 프로젝트에 선택된 장비 목록. 기계 기자재내역서(4-2)·설치비내역서(4-3)의 원천.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `selection_id` | uuid | PK |
| `project_id` | uuid | 프로젝트 FK |
| `process_id` | integer | 공정 번호 |
| `structure_id` | uuid | 구조물 FK (NULL 가능) |
| `equipment_id` | uuid | 장비 카탈로그 FK → `equipment_catalog.equipment_id` |
| `catalog_equipment_id` | uuid | GWD 실데이터 NULL ✅ (미사용) |
| `equipment_instance_id` | uuid | 장비 인스턴스 FK |
| `component_id` | uuid | 부품 FK |
| `selection_type` | varchar | `MAIN` / `MAIN_WITH_SPARE` |
| `quantity` | integer | 선택 수량 (상용+예비 합계) |
| `selection_reason` | text | 선택 사유 |
| `installation_location` | jsonb | 설치 위치 정보 |
| `used_parameters` | jsonb | 선정에 사용된 파라미터 |
| `created_at` | timestamptz | 생성일시 |

**샘플 데이터** (project_id = GWD):

| selection_type | quantity | equipment_id |
|---|---|---|
| MAIN | 2 | 019bd506-... |
| MAIN_WITH_SPARE | 3 | 019963e0-... |

> ✅ `selection_type = 'MAIN_WITH_SPARE'` 시: 상용+예비 포함한 전체 quantity.  
> ✅ `catalog_equipment_id` = NULL (실데이터 기준). 실제 FK는 `equipment_id`.

---

### 2.2 equipment_catalog — 장비 카탈로그

**역할**: 장비 사양·단가·호표 번호 저장. 기자재내역서 Item/Spec/재료비, 설치비 호표 매핑 원천.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `equipment_id` | uuid | PK |
| `equipment_code` | varchar | 장비 코드 (예: `M_AGT0602_VM_SAMJIN_SMS-154-3B`) |
| `equipment_type` | varchar | 장비 유형 코드 |
| `specifications` | jsonb | 사양 전체 (구조 아래 참조) |
| `output_values` | jsonb | 산출 결과 (invoice_price_KRW 등) |
| `search_criteria` | jsonb | 자동선정 검색 조건 |
| `root_equipment_type` | varchar | 최상위 장비 유형 |
| `unit_system_code` | varchar | METRIC / USCS |

**`specifications` JSONB 구조** (✅ 키별 형식 확인):

```json
{
  "productnm":      { "key": "productnm",      "value": "탈수기",    "name_kr": "품명" },
  "easpecific":     { "key": "easpecific",      "value": "...",       "name_kr": "규격" },
  "primary_item_no": { "key": "primary_item_no", "value": 1,          "name_kr": "호표(1)",
                       "original_field_name": "s_primary_item_no_NONE" },
  "remark":         { "key": "remark",          "value": "일반",      "name_kr": "분류" },
  "total_wgt_kg":   { "key": "total_wgt",       "value": 11,          "unit_symbol": "kg" },
  "power_kW":       { "key": "power",           "value": 7.5,         "unit_symbol": "kW" },
  ...
}
```

**BOQ 적용 규칙:**

| BOQ 항목 | 추출 경로 |
|---|---|
| 기자재 품명 | `specifications.productnm.value` |
| 규격 | `specifications.easpecific.value` |
| 재료비 | `output_values.invoice_price_KRW` |
| 호표 번호 | `specifications.primary_item_no.value` → `unit_price_list_machinery WHERE id = {값}` |
| 공법/일반 분류 | `specifications.remark.value` = `"공법"` / `"일반"` ✅ |

> ✅ **공법 기자재 분류** (C-14 확정): `specifications.remark.value = "공법"` → 기계 총괄집계표(4-1) 공법 기자재비 열 기재. 집계는 엑셀 내장 수식으로 처리.  
> ✅ **호표 미등록**: `primary_item_no.value = null` → 설치비 0원 (관리자 미입력).

---

### 2.3 project_structure_selections × structures — 토목 구조물

**역할**: 프로젝트에 포함된 구조물 목록 및 치수. 토목내역서(2-1) 원천.

**project_structure_selections 스키마** (✅):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `project_structure_selection_id` | uuid | PK |
| `project_id` | uuid | 프로젝트 FK |
| `structure_id` | uuid | 구조물 FK → `structures.structure_id` |
| `custom_dimensions` | jsonb | 사용자 지정 치수 `{"W": 6.6, "L": 6.6, "H": 6.0}` |
| `quantity` | integer | 수량 |

**structures 스키마** (✅):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `structure_id` | uuid | PK |
| `project_id` | uuid | 프로젝트 FK |
| `structure_name` | varchar | 구조물 코드 (예: `S_CON01D`) |

> ✅ **치수 입력 방식** (C-5 확정): `custom_dimensions` W/L/H는 사용자가 직접 지정한 값이 시스템에 전달됨. 체적·면적 계산 및 여유율 적용은 엑셀 내장 수식으로 처리.  
> GWD: `S_CON01D` (W=6.6m, L=6.6m, H=6.0m) × 1

---

### 2.4 conduit_fitting_equipment_spec — 전선관 피팅 파생 규격

**역할**: 전선관 1m당 부속품(커플링 등) 파생 수량 결정. 전기 설치비내역서(6-2) 원천.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `conduit_fitting_equipment_spec_id` | integer | PK |
| `equipment_code` | varchar | 전선관 코드 (예: `E_CON0101_VM_0000_28`) |
| `productnm` | varchar | 품명 (예: `강제전선관`) |
| `easpecific` | varchar | 규격 (예: `28mm`) |
| `length` | integer | 전선관 기준 길이 (m 단위, 값=1) |
| `spec_equipment_code` | varchar | 파생 부속품 코드 (예: `E_CON0201_VM_0000_28`) |
| `spec_quantity` | numeric | 파생 수량/m (예: `0.166666667` ≈ 1/6) |

**샘플 데이터:**

| equipment_code | easpecific | length | spec_equipment_code | spec_quantity |
|---|---|---|---|---|
| E_CON0101_VM_0000_16 | 16mm | 1 | E_CON0201_VM_0000_16 | 0.167 |
| E_CON0101_VM_0000_22 | 22mm | 1 | E_CON0201_VM_0000_22 | 0.167 |
| E_CON0101_VM_0000_28 | 28mm | 1 | E_CON0201_VM_0000_28 | 0.167 |

> ✅ 전선관 1m당 커플링 1/6개 = 6m마다 커플링 1개 파생.  
> `equipment_code` = `conduit_power` / `conduit_control` 규격에서 파생.

---

### 2.5 cable_tray_equipment_spec — 케이블 트레이 파생 규격

**역할**: 케이블 트레이 수량당 파생 품목(접지선 등) 결정.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `cable_tray_equipment_spec_id` | integer | PK |
| `equipment_code` | varchar | 트레이 코드 (예: `E_TRA0101_VM_SEOYOUNG_150`) |
| `productnm` | varchar | 품명 (예: `용융 케이블 트레이`) |
| `easpecific` | varchar | 규격 (예: `W150 × H100 × 2.3t`) |
| `quantity` | integer | 트레이 기준 수량 (1) |
| `spec_equipment_code` | varchar | 파생 품목 코드 (예: `E_EET0304_VM_0000`) |
| `spec_quantity` | numeric | 파생 수량 (예: `2.0`) |

**샘플 데이터:**

| equipment_code | easpecific | spec_equipment_code | spec_quantity |
|---|---|---|---|
| E_TRA0101_VM_SEOYOUNG_150 | W150 × H100 × 2.3t | E_EET0304_VM_0000 | 2.0 |
| E_TRA0101_VM_SEOYOUNG_200 | W200 × H100 × 2.3t | E_EET0304_VM_0000 | 2.0 |

> ✅ 트레이 1개당 파생 품목 2개 (접지선 클램프 등).  
> 입력: `report.json.tray_quantity` (트레이 유형별 수량).

---

### 2.6 electric_control_equipment_spec — MCC 제어반 파생 규격

**역할**: MCC/MCCB/SPD/MC/INVERTER 수량에서 파생 부품 결정. 전기 기자재내역서(6-1) 원천.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `electric_control_equipment_spec_id` | integer | PK |
| `equipment_code` | varchar | 기기 코드 (예: `E_VCB0201_VM_LS_ELC_10_30_3`) |
| `productnm` | varchar | 기기 유형: `MCC` / `MCCB` / `SPD` / `MC` / `INVERTER` |
| `easpecific` | varchar | 기기 규격 (예: `ABS 30AF/15AT 3P`) |
| `quantity` | integer | 기기 기준 수량 (1) |
| `spec_equipment_code` | varchar | 파생 품목 코드 |
| `spec_quantity` | integer | 파생 수량 |

**파생 규칙 확정 전체** (✅ DB 전체 조회 검증):

| 기기 (productnm) | 파생 품목 | spec_equipment_code | 수량 |
|---|---|---|---|
| MCC | PVC DUCT (80) | `E_EET0117_VM_0000_80` | 1 |
| MCCB | THERMINAL BLOCK | `E_EET0126_VM_0000_{정격}` | 1 |
| SPD | CONDENSER | `E_EET0115_VM_...` | 1 |
| SPD | FUSE & FUSE HOLDER | `E_EET0116_VM_...` | 3 |
| SPD | NAME PLATE | `E_EET0118_VM_0000` | 1 |
| MC | ZCT 회로 | `E_EET0119_VM_...` | 1 |
| MC | DMPR CABLE 회로 | `E_EET0120_VM_...` | 1 |
| INVERTER | INVERTER LOADER | `E_EET0111_VM_0000` | 1 |
| INVERTER | FAN | `E_EET0112_VM_0000` | 1 |
| INVERTER | FANCOVER | `E_EET0113_VM_0000` | 1 |
| INVERTER | FAN용 THERMOSTAT | `E_EET0114_VM_0000` | 1 |

---

### 2.7 compression_copper_terminal_spec — 단자 파생 규격

**역할**: 케이블 규격·field_type별 압착단자/동관단자 수량 결정. 전기 기자재내역서(6-1) 원천.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `compression_copper_terminal_spec_id` | integer | PK |
| `field_type` | varchar | `TITLE` / `ITEM` (elec_power_equip_list field_type과 동일) |
| `equipment_code` | varchar | 케이블 코드 (예: `E_CAB01_VM_0000_35_4`) |
| `process_name` | varchar | 적용 설비 유형 (예: `electrical_equipment`) |
| `terminal_type` | varchar | `compression` (압착단자) / `cooper` (동관단자) / 빈 문자열 |
| `terminal_code` | varchar | 단자 코드 (예: `E_TRM0201_VM_0000_35`) |
| `quantity` | numeric | 적용 수량 |

**`equipment_code` 생성 규칙** (✅ DB 패턴 확인):

```
equipment_code = "E_CAB01_VM_0000_{crosssection}_{cores}"
  crosssection: cable_cv 규격에서 ㎟ 수치 (예: "35SQ 4C" → 35)
  cores:        cable_cv 규격에서 코어수 (예: "35SQ 4C" → 4)

예) cable_cv = "35SQ 4C" → equipment_code = "E_CAB01_VM_0000_35_4"
```

**단자 파생 결과 패턴** (✅ 샘플 데이터 확인):

| field_type | 케이블 규격 | terminal_type | 단자 코드 | quantity |
|---|---|---|---|---|
| ITEM (electrical_equipment) | X SQ 3C | compression | E_TRM0201_VM_0000_{X} | 6 (3×2) |
| ITEM (electrical_equipment) | X SQ 4C | compression | E_TRM0201_VM_0000_{X} | — |
| TITLE | 16SQ 이상 4C | cooper | E_TRM0101_VM_0000_{X} | 8 (4×2) |
| TITLE | 3C 이하 또는 소규격 | (빈 문자열) | — | null |

> ✅ ITEM 3C: 압착단자(E_TRM0201) quantity=6 (코어수 3 × 양단 2).  
> ✅ TITLE 4C ≥16㎟: 동관단자(E_TRM0101) quantity=8.  
> ✅ TITLE 3C: terminal_type 빈 문자열, quantity null → 단자 산출 제외.

---

### 2.8 unit_price_list_machinery — 기계 호표 단가

**역할**: 기계 설치비(4-3)·일위대가(4-4, 4-5)의 단가 원천.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | integer | PK (호표 번호와 별도 — `no` 컬럼이 표시 호표) |
| `no` | varchar | 호표 표시명 (예: `호표1`, `호표5`) |
| `item` | varchar | 공종명 (예: `일반기기설치(20% 가산)`) |
| `specification` | varchar | 적용 사양 (예: `0.5ton 미만`) |
| `quantity` | numeric | 수량 (1) |
| `unit` | varchar | 단위: `ton` (중량 기준) 또는 `대` |
| `material_cost` | numeric | 재료비 (0) |
| `labor_cost` | numeric | 노무비 단가 (원) |
| `overhead` | numeric | 경비 (0) |

**호표 매핑 경로** (✅):

```
equipment_catalog.specifications.primary_item_no.value
  → unit_price_list_machinery WHERE id = {primary_item_no.value}
  → labor_cost, overhead → 설치비 계산
```

**샘플 데이터:**

| id | no | item | specification | unit | labor_cost |
|---|---|---|---|---|---|
| 1 | 호표1 | 일반기기설치(20% 가산) | 0.5ton 미만 | ton | 4,949,554원 |
| 2 | 호표2 | 일반기기설치(10% 가산) | 0.5~1ton 미만 | ton | 4,537,092원 |
| 3 | 호표3 | 일반기기설치 | 1~5ton 미만 | ton | 4,124,629원 |
| 5 | 호표5 | 일반펌프설치 | 0.75kW 이하 | 대 | 225,172원 |

---

### 2.9 unit_price_list_plumbing — 배관 호표 단가

**역할**: 배관 설치비(5-1)·일위대가(5-3, 5-4)의 단가 원천.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `unit_price_list_plumbing_id` | integer | PK |
| `no` | varchar | 호표 표시명 (예: `호표1`) |
| `item` | varchar | 공종명 (예: `강관설치공사(옥내-용접)`) |
| `specification` | varchar | 구경 (예: `6A TON`, `15A TON`) |
| `quantity` | numeric | 수량 (1) |
| `unit` | varchar | `ton` (배관 중량 기준) |
| `material_cost` | numeric | 재료비 (0) |
| `labor_cost` | numeric | 노무비 단가 (원) |
| `overhead` | numeric | 경비 단가 (원) |

**샘플 데이터:**

| unit_price_list_plumbing_id | no | item | specification | unit | labor_cost | overhead |
|---|---|---|---|---|---|---|
| 1 | 호표1 | 강관설치공사(옥내-용접) | 6A TON | ton | 52,678,648원 | 1,580,359원 |
| 4 | 호표4 | 강관설치공사(옥내-용접) | 15A TON | ton | 26,911,918원 | 807,358원 |

---

### 2.10 electric_cable_unit_price — 전기 호표 단가

**역할**: 전기 설치비(6-2)·일위대가(6-3, 6-4)의 단가 원천. 케이블·전선관·트레이·단자 설치 단가 포함.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `electric_cable_unit_price_id` | integer | PK |
| `primary_item_no` | integer | 호표 번호 (표시용) |
| `item` | varchar | 품목명 (예: `0.6/1kV 난연 전력 케이블(F-CV)`) |
| `specification` | varchar | 규격 (예: `4㎟ 3C`) |
| `quantity` | numeric | 수량 (1) |
| `unit` | varchar | `m` (케이블), `EA` 등 |
| `material_cost` | numeric | **NULL** — 재료비는 외부 물가자료 ⚠️ |
| `labor_cost` | numeric | 설치 노무비 단가 (원) |
| `overhead` | numeric | 경비 단가 (원) |

**샘플 데이터:**

| primary_item_no | item | specification | unit | material_cost | labor_cost | overhead |
|---|---|---|---|---|---|---|
| 1 | 0.6/1kV 난연 전력 케이블(F-CV) | 4㎟ 3C | m | NULL | 13,967원 | 419원 |
| 2 | 0.6/1kV 난연 전력 케이블(F-CV) | 6㎟ 3C | m | NULL | 13,967원 | 419원 |

> ⚠️ **재료비 = NULL**: 전선 재료비는 외부 물가자료(건설공사표준품셈) 기준. DB에 저장 없음. 연동 방식 소스코드 확인 필요 (C-2).

---

### 2.11 maintenance_cost — 유지관리 단가

**역할**: 토목 공종 단가 + 유지관리비 단가 (약품·전력·수도·슬러지) 통합 저장.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `maintenance_cost_id` | integer | PK |
| `cost_category` | text | 대분류 (예: `토목`, `유지관리`) |
| `item_name` | text | 항목명 (예: `표토제거`) |
| `item_spec` | text | 규격 (예: `T=20cm`) |
| `unit_of_measure` | text | 단위 (예: `㎡`, `㎥`) |
| `unit_price_value` | numeric | 단가 |
| `language` | text | `kr` |
| `unit_spec` | text | `metric` |
| `code_name` | text | 조회 키 (예: `sitePreparationWorks`, `CHEM_PLMSL`) |

**조회 패턴:**
```sql
SELECT unit_price_value FROM maintenance_cost WHERE code_name = '{코드명}'
```

**주요 코드명:**

| code_name | 용도 | 단위 | 비고 |
|---|---|---|---|
| `sitePreparationWorks` | 표토제거 | ㎡ | 502원 |
| `plainConcreteFoundation` | 콘크리트(무근) | ㎥ | 18,695원 |
| `reinforcedConcreteWall` | 콘크리트(철근벽체) | ㎥ | 30,105원 |
| `ArchitecturalConstructionCost` | 건축 단가 | ㎡ | 3,000,000원 |
| `ELECT_BMC` | 전력 기본요금 | 원/kW·월 | 8,320원 |
| `ELECT_UF` | 전력 사용요금 | 원/kWh | 98원 |
| `CHEM_PLMSL` | 폴리머(고상) | 원/kg | — |
| `CHEM_PAC17` | PAC(17%) | 원/kg | — |
| `SLUDGE_UP` | 슬러지 처리비 | 원/t | — |
| `WATER_TARIFF` | 상수도 | 원/㎥ | — |

---

## 3. MinIO 연산 상세

| 작업 | 버킷 | 오브젝트 경로 |
|---|---|---|
| 템플릿 읽기 | `wai-project` | `{project_id}/template/kr/metric/r12.xlsx` |
| 결과 저장 | `wai-project` | `{project_id}/result/kr/metric/r12_작업완료.xlsx` |
| 공정 결과 읽기 | `wai-project` | `{project_id}/report.json` |

**report.json 주요 키 구조:**

```json
{
  "pipe_quantities": [
    { "pipe_code": "STS 304", "diameter": 80, "schedule": 10, "quantity": 12.5, "unit": "m" }
  ],
  "building_structures": [
    { "name": "탈수동", "W": 8.5, "L": 11.0, "floors": 1 }
  ],
  "OPX.sludge_1": "name: SLUDGE_UP, value: 2.981575, unit: ??t, remark: cake disposal cost",
  "OPX.chemical_1": "name: CHEM_PLMSL, value: 5.33545, unit: ??kg, remark: polymer cost",
  "EQP.{code_key}.power_kW": 3.7,
  "EQP.{code_key}.demand_factor_percent": 60.0
}
```

> ✅ **OPX 키 해석** (C-13 확정): `name` 필드 = `maintenance_cost.code_name` 조회 키, `value` 필드 = 수량/일. Python이 이 값을 파싱해 단가 조회 후 Excel에 기입.

---

## 4. BOQ 생성 API 엔드포인트

❓ API 엔드포인트 미확인. 소스코드 또는 `openapi.json` 확인 필요.

**추정 패턴** (전기설계 패턴 기반, 미확정):

| 기능 | 추정 메서드 | 추정 경로 |
|---|---|---|
| BOQ 생성 트리거 | POST | `/api/v1/projects/{project_id}/boq/generate` |
| BOQ 파일 다운로드 | GET | `/api/v1/projects/{project_id}/boq/download` |

> ❓ 실제 엔드포인트는 소스코드 또는 API 문서(`openapi.json`) 확인 필요.

---

## 5. DB 조회 쿼리 패턴

### 5.1 기계 기자재 전체 조회

```sql
SELECT
  pes.selection_id,
  pes.selection_type,
  pes.quantity,
  ec.equipment_code,
  ec.specifications->>'productnm'                    AS productnm,
  ec.specifications->>'easpecific'                   AS easpecific,
  (ec.specifications->'remark'->>'value')            AS remark,
  (ec.output_values->>'invoice_price_KRW')::numeric  AS invoice_price,
  (ec.specifications->'primary_item_no'->>'value')   AS primary_item_no
FROM project_equipment_selections pes
JOIN equipment_catalog ec ON ec.equipment_id = pes.equipment_id
WHERE pes.project_id = '{project_id}'
ORDER BY pes.process_id, pes.created_at;
```

### 5.2 호표 단가 조회 (기계)

```sql
SELECT id, no, item, specification, unit, labor_cost, overhead
FROM unit_price_list_machinery
WHERE id = {primary_item_no};
```

### 5.3 단자 파생 조회

```sql
SELECT terminal_type, terminal_code, quantity
FROM compression_copper_terminal_spec
WHERE field_type = '{field_type}'
  AND equipment_code = 'E_CAB01_VM_0000_{crosssection}_{cores}';
```

### 5.4 MCC 파생 품목 조회

```sql
SELECT productnm, easpecific, spec_equipment_code, spec_quantity
FROM electric_control_equipment_spec
WHERE equipment_code = '{mcc_or_mccb_or_spd_code}';
```

### 5.5 유지관리 단가 조회

```sql
SELECT unit_price_value
FROM maintenance_cost
WHERE code_name = 'CHEM_PLMSL'  -- 또는 SLUDGE_UP / ELECT_BMC 등
  AND language = 'kr' AND unit_spec = 'metric';
```

### 5.6 공법 기자재 분류 조회

```sql
SELECT
  ec.specifications->'remark'->>'value' AS item_category,  -- "공법" or "일반"
  ec.specifications->>'productnm'       AS productnm,
  ec.output_values->>'invoice_price_KRW' AS price
FROM project_equipment_selections pes
JOIN equipment_catalog ec ON ec.equipment_id = pes.equipment_id
WHERE pes.project_id = '{project_id}'
  AND ec.specifications->'remark'->>'value' = '공법';
```

---

## 6. 미확정 항목

| # | 항목 | 상태 |
|---|---|---|
| C-1 | `tray_quantity` 복수 트레이 배열 구조 | ⚠️ 소스코드 확인 |
| C-2 | 전선·배관 재료비 외부 물가자료 연동 방식 | ⚠️ 소스코드 확인 |
| C-3 | `pipe_code` 형태A/B 혼재 처리 로직 | ⚠️ 이안 확인 |
| C-6b | `building_structures` 수신 구조 상세 | ⚠️ 소스코드 확인 |
| C-12 | 계측기 전선관 길이 산출 방식 | ⚠️ `elec_instrument_list` 거리 컬럼 없음 |
| API | BOQ 생성 API 엔드포인트 | ❓ `openapi.json` 확인 |
