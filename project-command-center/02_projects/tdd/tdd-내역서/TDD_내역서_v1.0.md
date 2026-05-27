# TDD — 내역서(BOQ) 생성 규칙 v1.0

작성일: 2026-05-22  
작성자: 최윤규  
상태: 작업본 (DB/MinIO 실데이터 기반 검증 완료 ✅ / 소스코드 확인 필요 ⚠️ 구분)

> v1.0 변경 (v0.5 대비): 전기설계 TDD 형태로 전면 재작성 —
> - 문서 구조: 범위/흐름/자료원천/입력구조/기준정보/산출과정/모듈제안/검증시나리오/미확정항목/키워드 순으로 재편
> - 섹션 6: 수량 산출 과정 전 파트 번호 단계화 (기계/전기/배관/토목/건축/유지관리)
> - 섹션 11: 프로그램 구현 모듈 제안 신규 추가
> - 섹션 12: 검증 시나리오 (GWD 실제 수치 기반) 신규 추가
> - 섹션 13: 미확정 항목 테이블 재정리
> - 섹션 14: 소스코드 확인 시 우선 검색 키워드 신규 추가
> - `electric_control_equipment_spec` 파생 규칙 전체 확정 반영 (MC → ZCT/DMPR, INVERTER → FAN류 추가)

> **표시 규칙**
> - `✅ 확정` — DB/MinIO/샘플 데이터로 검증 완료
> - `⚠️ 소스코드 확인 필요` — 방향은 알지만 알고리즘 세부 미확정
> - `❓ 미확인` — 정보 자체가 없음

**참조 프로젝트:**

| 코드 | project_id | 비고 |
|---|---|---|
| `1s1s1a1s` | `019e00d8-aa36-7fd1-b5b8-1b874e2e477b` | 기본 샘플 (단순 구성) |
| GWD | `019e4d2e-dc83-7154-b1fe-f647b35dbcac` | 실제 발주 프로젝트. BOQ Excel 교차검증 완료 ✅ |

---

## 1. 문서 범위

포함 범위:

- 내역서(BOQ) xlsx 파일 자동 생성 과정 전체
- 19개 기본 시트 + 2개 조건부 시트(수변전설비) 생성 규칙
- 기계/전기/배관/토목/건축/유지관리비 수량 산출 로직
- 기준정보 테이블(파생 산식, 단가 출처) 구조
- 템플릿 로드 → 데이터 주입 → 결과 파일 저장 과정

제외 범위:

- 전기계산서(electricalcapacity.xlsx) 산출 과정 → `tdd-전기설계/TDD_전기설계_v0.3.md`
- P&ID 2D 도면 생성 → `tdd-2D생성/TDD_2D생성_v0.1.md`
- 3D 배선 경로 산출 자체 로직 (3D 엔진 영역)
- 전기설계 부하계산/기기선정 과정 (전기설계 TDD 담당)

---

## 2. BOQ 생성 전체 흐름

```
[전제 조건]
  공정/장비 선택 완료
  전기설계 계산 완료 (elec_power_equip_list, elec_instrument_list 데이터 존재)
  3D 배선 완료 (std_distance_m 반영됨)
  배관 3D 완료 시 → report.json.pipe_quantities[] 생성

[입력 데이터 수집]
  project_equipment_selections     ← 기계 장비 목록 + 수량
  project_structure_selections     ← 토목 구조물 치수
  elec_power_equip_list            ← 전기 동력설비 케이블/전선관 정보
  elec_instrument_list             ← 계측기 케이블/전선관 정보
  report.json.tray_quantity        ← 케이블트레이 수량
  report.json.pipe_quantities[]    ← 배관 수량
  report.json.building_structures  ← 건축물 면적 (3D 배치 시 자동 생성)

[수량 산출] — 섹션 6 참조
  ┌─ 기계: equipment_catalog 기준 장비 목록 + 설치 호표 매핑
  ├─ 전기: 전선/전선관/트레이/단자/MCC/LOP 파생 품목
  ├─ 배관: pipe_quantities[] → pipe_code 분류 → 재질/구경/길이
  ├─ 토목: custom_dimensions → 체적/면적 산출 ⚠️
  ├─ 건축: 연면적(㎡) × 3,000,000원/㎡
  └─ 유지관리비: 전력비 + 약품/용수/슬러지/경상수선비/에너지소모비

[단가 조회] — 기준정보 테이블 (섹션 5)
  기계 재료비:  equipment_catalog.output_values.invoice_price_KRW
  기계 설치비:  unit_price_list_machinery (호표 기준)
  전기 재료비:  외부 물가자료 연동 ⚠️
  전기 설치비:  electric_cable_unit_price
  배관 재료비:  외부 물가자료 연동 ⚠️
  배관 설치비:  unit_price_list_plumbing
  토목/건축:    maintenance_cost (code_name 기준)
  유지관리비:   maintenance_cost (ELECT_BMC/UF, CHEM_*, WATER_TARIFF 등)

[금액 계산]
  ROUNDUP(수량 × 단가, 0)

[일위대가 시트 생성]
  4-4/4-5: unit_price_list_machinery
  5-3/5-4: unit_price_list_plumbing
  6-3/6-4: electric_cable_unit_price

[유지관리비 집계]
  7-2 전력비: 설비별 동력 × 운전시간 기반 산출
  7-1 유지관리비내역서: 전력비 + 약품비 + 용수비 + 슬러지 + 경상수선비 + 에너지소모비

[총 공사비 집계]
  1. 총 공사비 시트: 토목/건축/기계/배관/전기 합산

[템플릿 로드 및 데이터 주입]
  MinIO: wai-project/{project_id}/template/kr/metric/r12.xlsx

[결과 파일 저장]
  MinIO: wai-project/{project_id}/result/kr/metric/r12_작업완료.xlsx
  시트 수: 19개 기본 + 2개 조건부(has_substation=true 시)
```

---

## 3. 자료 원천 (참조 파일)

| 구분 | 경로/위치 | 역할 |
|---|---|---|
| BOQ 최종 성과품 기준 | MinIO `wai-project/019e4d2e-.../result/kr/metric/r12_작업완료.xlsx` | 21개 시트 구조·수치 기준 (GWD) ✅ |
| BOQ 템플릿 | MinIO `wai-project/{project_id}/template/kr/metric/r12.xlsx` | 시트 구조 기준 (656KB) |
| 배관/건축 데이터 | MinIO `wai-project/{project_id}/report.json` | pipe_quantities / tray_quantity / building_structures |
| BOQ 로컬 분석용 | `내역서 산출을 위한 기초자료__BOQ.xlsx` (프로젝트 루트) | GWD BOQ 로컬 복사본 (MinIO 동일) ✅ |
| 배관 산출 원본 | `99_reference/boq/originals/251217_내역서 산출과정 정리(배관)_r1.xlsx` | 배관/전기 연계 내역 원본 Excel |
| 전기 수량 연계 | `tdd-전기설계/TDD_전기설계_v0.3.md` | 전기 수량 산출 상세 |

---

## 4. 입력 데이터 구조

### 4.1 기계 파트 입력

| DB 테이블/필드 | 설명 | 비고 |
|---|---|---|
| `project_equipment_selections.equipment_id` | 선택 장비 ID | FK → equipment_catalog |
| `project_equipment_selections.quantity` | 장비 수량 | BOQ 수량 원천 |
| `equipment_catalog.specifications.productnm` | 장비명 | BOQ Item 컬럼 |
| `equipment_catalog.specifications.easpecific` | 사양 | BOQ Spec 컬럼 |
| `equipment_catalog.output_values.invoice_price_KRW` | 단가(원) | 재료비 원천 |
| `equipment_catalog.specifications.s_primary_item_no_NONE` | 호표 번호 | 설치비 매핑 키 (없으면 설치비 0원) |

### 4.2 전기 파트 입력

| DB 테이블/필드 | 설명 | 비고 |
|---|---|---|
| `elec_power_equip_list.field_type` | ITEM/TITLE 구분 | ITEM: 개별 설비, TITLE: MCC 피더 |
| `elec_power_equip_list.cable_cv` | CV 케이블 규격 | 예: "4SQ 3C" |
| `elec_power_equip_list.cable_gv` | GV 케이블 규격 | 예: "4SQ" |
| `elec_power_equip_list.plc_cable_cvv` | CVV 케이블 규격 | 제어 케이블 |
| `elec_power_equip_list.plc_cable_cvv_sb` | CVV-SB 케이블 규격 | PLC 제어 케이블 |
| `elec_power_equip_list.std_distance_m` | 전선 길이 (m) | 3D 경로 기반. TITLE=30m 고정 ✅ |
| `elec_power_equip_list.conduit_power` | 동력 전선관 규격 | 예: "28C" |
| `elec_power_equip_list.conduit_control` | 제어 전선관 규격 | 예: "22C", NULL 가능 |
| `elec_power_equip_list.conduit_length_m` | 전선관 길이 (m) | Tray 구간 제외. TITLE은 NULL ✅ |
| `elec_power_equip_list.normal_count` | 상용 수량 | 전선관 수량 계산에 사용 |
| `elec_power_equip_list.total_quantity` | 상용+예비 수량 합계 | 전선 수량 계산에 사용 |
| `elec_instrument_list.conduit_power` | 계측기 동력 전선관 규격 | |
| `elec_instrument_list.conduit_control` | 계측기 제어 전선관 규격 | |
| `elec_instrument_list.cable_cv` | 계측기 CV 케이블 | |
| `elec_instrument_list.cable_gv` | 계측기 GV 케이블 | |
| `elec_instrument_list.plc_cable_cvv_sb` | 계측기 CVV-SB 케이블 | |
| `elec_instrument_list.quantity` | 계측기 수량 | |
| `report.json.tray_quantity` | 케이블트레이 | quantity/specification/electrical_code |

### 4.3 배관 파트 입력

`report.json.pipe_quantities[]` 배열 각 항목:

| 필드 | 설명 | 예시 |
|---|---|---|
| `fitting_type` | 피팅 종류 | "FIT_STRAIGHT", "FIT_FLNG" |
| `pipe_code` | 재질 코드 (형태A/B 혼재) | "STS 304" 또는 equipment_code 전체 |
| `diameter` | 외경 (mm) | 80 |
| `schedule` | 스케줄 | "SCH10" |
| `quantity` | 수량 | 36.437 |
| `unit` | 단위 | "m" 또는 "EA" |

### 4.4 토목/건축 파트 입력

| DB 테이블/필드 | 설명 | 비고 |
|---|---|---|
| `project_structure_selections.structure_id` | 구조물 종류 FK | → structures.structure_id |
| `project_structure_selections.custom_dimensions` | 구조물 치수 | `{"W":6.6,"L":6.6,"H":6.0}` 형태 (m 단위) |
| `project_structure_selections.quantity` | 구조물 수량 | |
| `structures.name` | 구조물 명칭 | 예: S_CON01D |
| `report.json.building_structures[]` | 건축물 면적 | 3D 배치 시 자동 생성. 빈 배열이면 0원 |

### 4.5 유지관리비 파트 입력

| DB 테이블/필드 | 설명 | 비고 |
|---|---|---|
| `project_equipment_selections.quantity` | 설비 대수 | 전력비 계산용 |
| `equipment_catalog` (power_kw, demand_factor 등) | 설비 전기 속성 | 전력비 계산용 |
| `projects.building_load_percent` | 건축부하 비율 | 계약전력 가산 항목 ✅ |
| `maintenance_cost` | 유지관리비 단가 | code_name 기준 조회 |

---

## 5. 기준정보 테이블 구조

### 5.1 conduit_fitting_equipment_spec — 전선관 파생 품목

전선관 1m당 파생되는 부속 품목 산식. 규격별 계수 동일 (모든 프로젝트 공통 고정값 ✅).

| 파생 품목 코드 | 품명 | 규격 | 산식 (강제전선관 1m당) |
|---|---|---|---|
| `E_CON0102_VM_0000_{규격}` | 노말밴드 | — | × 1/12 |
| `E_CON0201_VM_0000_{규격}` | 가요전선관 1종 | — | × 1/6 |
| `E_CON0202_VM_0000_{규격}` | 박스커넥터 | — | × 1/6 |
| `E_EET0101_VM_0000` | 동력배관지지가대 | 2.3T 용융아연 | × 0.0267 |
| `E_EET0102_VM_0000` | 셋트앵커 | 3/8" | × 0.1067 |
| `E_EET0127_VM_0000` | U Channel 회로 | 41×41×t2.6mm | × 0.1333 |

### 5.2 cable_tray_equipment_spec — 트레이 파생 품목

| 파생 품목 코드 | 품명 | 산식 |
|---|---|---|
| `E_EET0304_VM_0000` | 용융 케이블트레이 JOINT CONNECTOR 회로 | DB spec_quantity 기반 |
| `E_EET0305_VM_0000` | 용융 케이블트레이 HOLD DOWN CLAMP 회로 | DB spec_quantity 기반 |
| `E_TRA0201_VM_SEOYOUNG_*` | 케이블 커버 | **미설치 — 산출 제외** ✅ |

### 5.3 electric_control_equipment_spec — MCC 구성 파생 품목

`productnm` 기준으로 파생 품목 결정. DB 전체 조회 확정 ✅.

| 파생 기준 (productnm) | 파생 품목 코드 | 품명 | 수량 |
|---|---|---|---|
| MCC | `E_EET0117_VM_0000_80` | PVC DUCT (80×80) | MCC 수 × 1EA |
| MCCB | `E_EET0126_VM_0000_{정격}` | THERMINAL BLOCK | MCCB 수 × 1EA |
| SPD | `E_CPC0201_VM_0000_10_440` | CONDENSER (10μF 440V) | SPD 수 × 1EA |
| SPD | `E_EET0108_VM_0000` | FUSE & HOLD (2A/KF-32L) | SPD 수 × 3EA |
| SPD | `E_EET0118_VM_0000_500` | NAME PLATE (500×50) | SPD 수 × 1EA |
| MC | `E_EET0106_VM_0000` | ZCT 회로 (LZR-030) | MC 수 × 1EA |
| MC | `E_EET0110_VM_0000` | DMPR CABLE 회로 (4M) | MC 수 × 1EA |
| INVERTER | `E_EET0111_VM_0000` | INVERTER LOADER 회로 (5M) | INVERTER 수 × 1EA |
| INVERTER | `E_EET0112_VM_0000` | FAN 회로 (120×120 38MM) | INVERTER 수 × 1EA |
| INVERTER | `E_EET0113_VM_0000` | FANCOVER 회로 (120mm) | INVERTER 수 × 1EA |
| INVERTER | `E_EET0114_VM_0000` | FAN용 THERMOSTAT (RTM 90F) | INVERTER 수 × 1EA |

### 5.4 compression_copper_terminal_spec — 단자 파생

| field_type | 대상 | 단자 종류 | 코드 | 수량 산식 |
|---|---|---|---|---|
| ITEM | 일반 장비 케이블 | 압착단자 | E_TRM0201 | 코어수 × 2EA |
| INSTRUMENT | 계측기 케이블 | 압착단자 | E_TRM0201 | 코어수 × 2EA |
| TITLE | MCC 피더 (16㎟ 이상 4C) | 동관단자 | E_TRM0101 | 코어수 × 2EA |
| TITLE | 소형 케이블 (3C 이하) | 동관단자 없음 | — | — |

### 5.5 maintenance_cost — 유지관리비/단가 기준

**전력 단가:**

| code_name | 항목 | 단가 |
|---|---|---|
| `ELECT_BMC` | 전기 기본요금 | 8,320원/kW·월 |
| `ELECT_UF` | 전기 사용요금 | 98원/kWh |

**약품비 단가:**

| code_name | 약품명 | 단가 |
|---|---|---|
| `CHEM_FECL338` | 염화철 (FeCl3 38%) | 550원/kg |
| `CHEM_H2SO4` | 황산 (H₂SO₄) | 170원/kg |
| `CHEM_KH2PO4` | 제인산칼륨 | 6,046원/kg |
| `CHEM_MEOH` | 메탄올 | 650원/kg |
| `CHEM_NAOH` | 가성소다 | 100원/kg |
| `CHEM_PAC17` | PAC 17% | 330원/kg |
| `CHEM_PLMLQ` | 폴리머 액체형 | 7,900원/kg |
| `CHEM_PLMSL` | 폴리머 고체형 | 7,900원/kg |

**기타 유지관리비 단가:**

| code_name | 항목 | 단가 |
|---|---|---|
| `WATER_TARIFF` | 용수비 | 800원/㎥ |
| `SLUDGE_UP` | 슬러지처리비 | 150,000원/ton |
| `LNG_UP` | 에너지 소모비 (LNG) | 1,420원/N㎥ |
| `ArchitecturalConstructionCost` | 건축공사비 | 3,000,000원/㎡ |

**토목 단가 (전체 확정 ✅):**

| code_name | 항목 | 단위 | 단가(원) |
|---|---|---|---|
| sitePreparationWorks | 표토제거 | ㎡ | 502 |
| excavation5mOrLess | 터파기 (5m이하) | ㎥ | 4,684 |
| excavationAbove5m | 터파기 (5m초과) | ㎥ | 6,792 |
| fillingWorks | 되메우기 | ㎥ | 6,736 |
| earthDisposal | 잔토처리 | ㎥ | 12,060 |
| plainConcreteFoundation | 무근콘크리트 (기초) | ㎥ | 18,695 |
| reinforcedConcreteSlab | 철근콘크리트 (슬라브) | ㎥ | 30,105 |
| reinforcedConcreteWall | 철근콘크리트 (벽체) | ㎥ | 30,105 |
| readyMixedConcrete2518 | 레미콘 (25-18-15) | ㎥ | 96,330 |
| readyMixedConcrete2530 | 레미콘 (25-30-15) | ㎥ | 114,300 |
| formWorkFoundation | 합판거푸집 (기초) | ㎡ | 45,596 |
| formWorkSlab | 합판거푸집 (슬라브) | ㎡ | 52,082 |
| euroFormWall | 유로폼 (벽체) | ㎡ | 51,212 |
| systemScaffold | 시스템 비계 | ㎡ | 15,182 |
| systemShore | 시스템 동바리 | 공/㎥ | 20,751 |
| reinforcingSteel | 철근 | ton | 930,000 |
| reinforcingBarWork | 철근가공 및 조립 | ton | 908,152 |
| waterproofingInside | 방수 (내부) | ㎡ | 49,009 |
| waterproofingOutside | 방수 (외부) | ㎡ | 43,854 |
| temporaryStructures | 가시설공 (Sheet Pile) | m | 5,000,000 |

---

## 6. 수량 산출 과정

### 6.1 BOQ 시트 목록 (최종 성과품 기준)

> **기준 프로젝트: GWD (`019e4d2e-dc83-7154-b1fe-f647b35dbcac`)**  
> MinIO: `wai-project/019e4d2e-.../result/kr/metric/r12_작업완료.xlsx` (21개 시트) ✅

| # | 시트명 | 데이터 출처 | 상태 |
|---|---|---|---|
| 1 | **1. 총 공사비** | 각 시트 합산 | ✅ |
| 2 | **2-1. 토목내역서** | `project_structure_selections` | ⚠️ 수량 공식 미확정 |
| 3 | **3-1. 건축내역서** | `report.json.building_structures` | ⚠️ 면적 수신 방식 |
| 4 | **4-1. 기계 총괄 집계표** | 4-2·4-3 합산 | ✅ |
| 5 | **4-2. 기자재내역서(기계)** | `project_equipment_selections + equipment_catalog` | ✅ |
| 6 | **4-3. 설치비내역서(기계)** | `unit_price_list_machinery` (호표 기준) | ✅ |
| 7 | **4-4. 일위대가목록(기계)** | `unit_price_list_machinery` | ✅ |
| 8 | **4-5. 일위대가(기계)** | `unit_price_list_machinery` 세부 | ✅ |
| 9 | **4-6. 공사비 실행검토** | 4-2 기반 + 사용자 수동 네고율 | ⚠️ 소스코드 |
| 10 | **5-1. 배관공사비** | `report.json.pipe_quantities[]` | ✅ (빈 시트 가능) |
| 11 | **5-2. 단중표** | 고정 기준정보 (템플릿 사전 정의) | ✅ |
| 12 | **5-3. 일위대가목록(배관)** | `unit_price_list_plumbing` | ✅ |
| 13 | **5-4. 일위대가(배관)** | `unit_price_list_plumbing` 세부 | ✅ |
| 14 | **6-1. 기자재내역서(전기)** | `elec_power_equip_list + elec_instrument_list` | ✅ |
| 15 | **6-2. 설치비내역서(전기)** | `electric_cable_unit_price` | ✅ |
| 16 | **6-3. 일위대가목록(전기)** | `electric_cable_unit_price` | ✅ |
| 17 | **6-4. 일위대가(전기)** | `electric_cable_unit_price` 세부 | ✅ |
| 18 | **7-1. 유지관리비내역서** | 7-2 결과 + maintenance_cost | ⚠️ 약품/용수 수량 출처 |
| 19 | **7-2. 전력비** | `project_equipment_selections` + 전력 단가 | ✅ |
| 20 | **8-1. 총계표(수변전설비)** | 수변전설비 기준정보 | **조건부** ⚠️ |
| 21 | **8-2. 내역표(수변전설비)** | 수변전설비 기준정보 | **조건부** ⚠️ |

> - 기본 생성: 1~19번 (모든 프로젝트)
> - 조건부 생성: 20~21번 (`projects.has_substation = true` 시)
> - 배관 시트(5-1~5-4): 3D 라우팅 미완료 시 빈 시트 생성 ✅

---

### 6.2 기계 수량 산출 (시트: 4-2 기자재내역서, 4-3 설치비내역서)

```
1. project_equipment_selections WHERE project_id = {project_id} 전체 조회

2. equipment_id 기준으로 equipment_catalog JOIN

3. 각 장비별 BOQ 행 생성:
     Item     = specifications.productnm
     Spec     = specifications.easpecific
     Qty      = project_equipment_selections.quantity
     Unit     = EA
     재료비   = output_values.invoice_price_KRW

4. 설치비 매핑 (4-3 설치비내역서):
     specifications.s_primary_item_no_NONE 조회
       → 값 있음: unit_price_list_machinery WHERE 호표번호 = s_primary_item_no_NONE
                  → 노무비 단가, 경비 단가 적용
       → 값 없음 또는 NULL: 설치비 0원 (관리자 미등록)

5. 기계 총괄 집계표 (4-1):
     1.1 일반 기자재비    = 4-2 기자재내역서 합계
     1.2 일반기자재 설치비 = 4-3 설치비내역서 합계
     1.3 공법 기자재비    = 공법 장비 해당 시 (없으면 0원)
```

> **검증 ✅** (GWD 1s1s1a1s): 일반기자재비 84,400,000원, 설치비 1,648,235원 (노무비 1,603,112원 포함)

---

### 6.3 전기 수량 산출 (시트: 6-1 기자재내역서, 6-2 설치비내역서)

#### 6.3.1 전선 수량

```
1. elec_power_equip_list WHERE project_id = {project_id} 전체 조회
   elec_instrument_list WHERE project_id = {project_id} 전체 조회

2. 케이블 규격별 분류 (cable_cv / cable_gv / plc_cable_cvv / plc_cable_cvv_sb 기준 그룹핑)

3. 전선 수량(M) 계산:
     동력설비:  Σ(std_distance_m × total_quantity)
                total_quantity = normal_count + spare_count
     계측기:    Σ(std_distance_m × quantity)
                계측기 std_distance_m = 30m 고정 ✅

4. 동일 규격 합산 → 1개 BOQ 행 (Item/Spec별 Σ)

5. 재료비: 외부 물가자료 연동 ⚠️ (electric_cable_unit_price 출처 컬럼 = 물가자료 페이지 번호)
   설치비: electric_cable_unit_price 호표 기준
   설치비 0원 케이스: unit_price_list 미등록 품목 (예: F-CV 2.5SQ 3C) ✅
```

> **검증 ✅** (GWD): F-CV 2.5SQ 3C=150M, F-GV 4SQ=609M, F-CVV-SB 4종 BOQ 일치

#### 6.3.2 전선관 수량

```
1. ITEM 행 각 장비별:
     동력 전선관(M) = conduit_length_m × normal_count   (규격 = conduit_power)
     제어 전선관(M) = conduit_length_m × normal_count   (규격 = conduit_control)

     ※ conduit_power == conduit_control:
       동력·제어 케이블이 동일 전선관 공유 → 1본만 계산 (중복 합산 안 함) ✅
     ※ TITLE 행 (MCC 피더):
       conduit_length_m = NULL → 전선관 산출 대상 제외 (MCC 내부 결선) ✅
     ※ 예비 장비 전선관 미시공: normal_count만 사용 (spare_count 제외) ✅

2. 계측기 전선관:
     규격: elec_instrument_list.conduit_power / conduit_control
     ⚠️ 전선관 길이: elec_instrument_list에 거리 컬럼 없음 — 소스코드 확인 필요

3. 규격별 합산:
     강제전선관(규격별) = Σ 각 장비의 해당 규격 전선관 길이

4. 파생 품목 산출 (conduit_fitting_equipment_spec 적용, 섹션 5.1):
     노말밴드   = 강제전선관(M) × 1/12
     가요전선관 = 강제전선관(M) × 1/6
     박스커넥터 = 강제전선관(M) × 1/6
     지지가대   = 강제전선관(M) × 0.0267
     셋트앵커   = 강제전선관(M) × 0.1067
     U Channel  = 강제전선관(M) × 0.1333
```

> **검증 ✅** (GWD): 28C BOQ=306M (M-101/102/103/203/204 동력=제어 공유 + 계측기 FIT-2301/2101 합산), 22C BOQ=48M (M-202 제어 38m + 계측기 LIT-1001 합산)

#### 6.3.3 케이블트레이 수량

```
1. report.json.tray_quantity 조회:
     electrical_code: E_TRA0101_VM_SEOYOUNG_500
     specification:   W500*100H*2.3t
     quantity:        20 EA (예: GWD 기준)

2. 트레이 본체 BOQ 행:
     Item = 케이블트레이
     Spec = tray_quantity.specification
     Qty  = tray_quantity.quantity (EA)

3. 파생 품목 산출 (cable_tray_equipment_spec 적용, 섹션 5.2):
     JOINT CONNECTOR = DB spec_quantity 기반
     HOLD DOWN CLAMP = DB spec_quantity 기반
     케이블 커버: 미설치 — 산출 제외 ✅

⚠️ tray_quantity 복수 종류 시 배열 여부 소스코드 확인 필요
```

#### 6.3.4 단자 수량

```
1. elec_power_equip_list 전체 행 대상
2. field_type + cable_cv 규격으로 코어수 결정:
     코어수 = cable_cv 규격에서 추출 (예: "35SQ 4C" → 4)

3. field_type별 단자 종류 적용 (compression_copper_terminal_spec):
     ITEM:       압착단자(E_TRM0201) = 코어수 × 2EA
     INSTRUMENT: 압착단자(E_TRM0201) = 코어수 × 2EA
     TITLE (16㎟ 이상 4C): 동관단자(E_TRM0101) = 코어수 × 2EA
     TITLE (3C 이하): 동관단자 산출 제외

4. 압착단자/동관단자 규격별 합산 → 1개 BOQ 행
```

#### 6.3.5 MCC 구성 품목 및 파생

```
MCC 구성 품목 수량 결정:
  - MCC 그룹 수          → MCC(E_EET0103) 수량
  - MCCB 수량            → elec_power_equip_list 기반
  - SPD 수량             → 배전반 차단기 기준
  - MC 수량 (S_SYS01)    → elec_power_equip_list ITEM 중 S_SYS01 설비
  - INVERTER 수량 (S_SYS02) → elec_power_equip_list ITEM 중 S_SYS02 설비

파생 품목 산출 (electric_control_equipment_spec 적용, 섹션 5.3):
  MCC → PVC DUCT(E_EET0117_VM_0000_80) × MCC 수
  MCCB → THERMINAL BLOCK(E_EET0126_VM_0000_{정격}) × MCCB 수
  SPD → CONDENSER × 1 + FUSE&HOLD × 3 + NAME PLATE × 1 (각각 SPD 수 기준)
  MC → ZCT 회로 × 1 + DMPR CABLE 회로 × 1 (각각 MC 수 기준)
  INVERTER → INVERTER LOADER × 1 + FAN × 1 + FANCOVER × 1 + THERMOSTAT × 1
```

#### 6.3.6 현장조작반(LOP) 파생 품목

```
1. elec_power_equip_list에서 control_panel_type = "LOP" 행 집계
   → E_EET0104_VM_0000_{회로수} 회로수별 수량

2. LOP 수량 기준 파생 품목:
     MCCB          × 2
     PBL RED/GREEN/YELLOW × 각 1
     Selector Switch × 1
     Emergency Switch × 1
     2구 콘센트    × 1
     Name Plate (현장조작반) × 1
     KIV Cable     × 60M
     압착단자      × 48EA
     Fan / Fan Cover × 각 1
```

---

### 6.4 배관 수량 산출 (시트: 5-1 배관공사비)

```
1. report.json.pipe_quantities[] 조회
   → 빈 배열([]) → 배관 내역서 시트 헤더만 생성 (빈 시트) ✅

2. pipe_code 형태 분류:
     형태A: 단순 재질 표기 (예: "STS 304")
       → fitting_type = "FIT_STRAIGHT" (배관 자동 라우팅, 직관)
       → diameter + schedule로 규격 식별
     형태B: equipment_code 형태
       (예: "KSD3576_STS304_VM_0000_80_10_FIT_FLNG_J_FLANGE")
       → 프리셋 등록 피팅류
       → equipment_code로 equipment_catalog 직접 조회 가능

3. 항목별 BOQ 행 생성:
     Item = 관종 (예: STS 304 배관)
     Spec = 외경 × 두께 또는 구경 × SCH
     Qty  = quantity
     Unit = m 또는 EA

4. 단중표(5-2) 적용:
     배관 중량(ton) = 배관 길이(m) × 단위중량(kg/m) / 1000
     (배관 설치 호표 중량당 단가 적용 시 사용)

5. 재료비: 외부 물가자료 ⚠️
   설치비: unit_price_list_plumbing 호표 기준

⚠️ pipe_code 형태A/B 혼재 처리 방식 소스코드 확인 필요 (이안)
```

---

### 6.5 토목 수량 산출 (시트: 2-1 토목내역서)

```
1. project_structure_selections WHERE project_id = {project_id} 조회
   JOIN structures ON structures.structure_id = pss.structure_id

2. custom_dimensions에서 치수 추출:
     W = custom_dimensions["W"] (m)
     L = custom_dimensions["L"] (m)
     H = custom_dimensions["H"] (m)
     ✅ 이 값들은 사용자가 직접 지정해서 시스템에 전달한 값 (소스 계산 없음)

3. 치수 기반 수량 산출:
   항목별 체적·면적 계산 및 여유율 적용은 엑셀 내장 수식으로 처리
   예상 항목 구성:
     토공: 표토제거(㎡), 터파기(㎥), 되메우기(㎥), 잔토처리(㎥)
     구조물공: 무근/철근콘크리트(㎥), 거푸집(㎡), 비계, 동바리, 철근, 방수
     가시설·부대: Sheet Pile, 부대비용(토공+구조물공+가시설 합계의 20%)

4. 단가 적용:
     SELECT * FROM maintenance_cost WHERE code_name = {항목코드}
     (섹션 5.5 토목 단가 전체 목록 참조 ✅)
```

> **GWD 구조물**: S_CON01D (W=6.6, L=6.6, H=6.0) × 1, BOQ 토목 = 323.649백만원 ✅

---

### 6.6 건축 수량 산출 (시트: 3-1 건축내역서)

```
1. report.json.building_structures[] 조회
   → 빈 배열([]) → 건축 BOQ 0원 처리

2. 건축물 연면적(㎡) = Σ(각 동의 W × L × 층수)

3. 금액 산출:
     건축공사비(원) = 연면적(㎡) × 3,000,000원/㎡
     단가 출처: maintenance_cost.ArchitecturalConstructionCost ✅

4. 시트 구성:
     상단: 공종/단위/단가(원)/건축공사비(원)/비고
     하단: 동명/연면적(W×L×층수)/적용면적(㎡) 산출 테이블

⚠️ building_structures 수신 구조 상세 소스코드 확인 필요
```

> **GWD 실측**: 건축 561,000,000원 (탈수동 93.5㎡ + 창고 93.5㎡ = 187㎡ × 3,000,000원) ✅

---

### 6.7 유지관리비 산출 (시트: 7-1, 7-2)

#### 6.7.1 전력비 (7-2 시트)

```
1. 설비별 전력 데이터 수집 (project_equipment_selections 기반):
     기기명 / 상용대수 / 예비대수 / 동력(kW/대) / 수용율(%) / 운전시간(hr/일)

2. 계약전력(kW) 산출:
     수용동력 = Σ(power_kw × normal_count × demand_factor_percent/100)
     계약전력 = 수용동력 + projects.building_load_percent 적용 건축부하 분전반 용량
     → GWD: 수용동력 30.25kW + 건축부하 2.37kW = 32.62kW ✅

3. 설비별 사용전력(kWh/일):
     사용전력 = power_kw × normal_count × demand_factor_percent/100 × 운전시간(hr/일)

4. 전력비 산출:
     기본요금(원/년) = 계약전력(kW) × ELECT_BMC(8,320원/kW·월) × 12월
     사용요금(원/년) = Σ사용전력(kWh/일) × ELECT_UF(98원/kWh) × 365일
     전력비 합계    = 기본요금 + 사용요금
```

#### 6.7.2 유지관리비내역서 (7-1 시트)

```
① 전력비:      7-2 시트 결과 합계

② 약품비:      약품 수량(kg/일) × maintenance_cost[CHEM_*] × 365일
               ⚠️ 약품 수량 데이터 출처 확인 필요

③ 용수비:      수량(㎥/일) × WATER_TARIFF(800원/㎥) × 365일

④ 슬러지처리비: 발생량(ton/일) × SLUDGE_UP(150,000원/ton) × 365일

⑤ 에너지소모비: 사용량(N㎥/일) × LNG_UP(1,420원/N㎥) × 365일

⑥ 경상수선비(원/년) = (토목 공사비 + 건축 공사비) × 0.001
                    + (기계 + 배관 + 전기) 공사비 × 0.005
   → 검증 ✅ (GWD: 323.65M×0.001 + 561.00M×0.001 + (308.92+12.81+102.23)M×0.005 = 3.004백만원)
```

---

## 7. 금액 계산 과정

```
재료비 금액 = ROUNDUP(수량 × 재료비 단가, 0)
노무비 금액 = ROUNDUP(수량 × 노무비 단가, 0)
경비 금액   = ROUNDUP(수량 × 경비 단가, 0)
합계        = 재료비 금액 + 노무비 금액 + 경비 금액
```

**파트별 단가 연결:**

| 파트 | 재료비 출처 | 노무비/경비 출처 |
|---|---|---|
| 기계 | `equipment_catalog.output_values.invoice_price_KRW` | `unit_price_list_machinery` (호표 기준) |
| 전기 | 외부 물가자료 연동 ⚠️ (출처 컬럼 = 물가자료 페이지) | `electric_cable_unit_price` (재료비 NULL) |
| 배관 | 외부 물가자료 연동 ⚠️ | `unit_price_list_plumbing` (호표 기준) |
| 토목/건축 | `maintenance_cost` (code_name 기준) | 통합 단가 (재료+노무+경비 합산) |
| 유지관리비 | `maintenance_cost` 각 항목 단가 | — |

---

## 8. 일위대가 시트 생성 (4-4/4-5, 5-3/5-4, 6-3/6-4)

기계/배관/전기 각각 2개 시트씩 총 6개. 모두 DB 기준정보에서 자동 생성.

### 8.1 일위대가목록 (4-4, 5-3, 6-3)

컬럼: No. / Item / Specification / Quantity / Unit / 재료비 / 노무비 / 경비 / 비고

| 파트 | DB 테이블 | 내용 |
|---|---|---|
| 기계 (4-4) | `unit_price_list_machinery` | 호표1~N, 기기설치/펌프설치 등 |
| 배관 (5-3) | `unit_price_list_plumbing` | 호표1~N, 관종×구경별 설치공사 |
| 전기 (6-3) | `electric_cable_unit_price` | 호표1~N, 케이블/전선관/트레이 등 |

### 8.2 일위대가 (4-5, 5-4, 6-4)

컬럼: No. / Item / Specification / Quantity / Unit / 총액 / 재료비 / 노무비 / 경비  
(호표별 인력 직종·투입량·단가·공구손료 세부 행 포함)

```
금액 계산: 인력투입량 × 노임단가 + 공구손료(노무비의 3%)
```

> **✅ 일위대가 운영 방식**: 참고용 산식. 직종별 노임단가는 관리자가 Excel을 통해 수동 갱신. 자동화 범위 제외.

---

## 9. 총 공사비 집계 및 수변전설비

### 9.1 총 공사비 시트 (1. 총 공사비)

컬럼: 구분 / 금액 / 비고 (단위: 백만원)

| 구분 | 집계 원천 |
|---|---|
| 토목 | 2-1. 토목내역서 합계 |
| 건축 | 3-1. 건축내역서 합계 |
| 기계 | 4-1. 기계 총괄 집계표 합계 |
| 배관 | 5-1. 배관공사비 합계 |
| 전기·계측제어 | 6-1. 기자재내역서(전기) + 6-2. 설치비내역서(전기) |
| **공사비 계** | 위 합산 |
| 유지관리비 | 7-1. 유지관리비내역서 합계 |

### 9.2 수변전설비 (조건부 시트 8-1, 8-2)

**생성 조건:** `projects.has_substation = true` (전기설계 설정에서 사용자 선택 ✅)

**총계표(8-1):** 패널별 재료비+노무비 총계  
컬럼: NO. / 품명 / 규격 / 단위 / 수량 / 재료비(단가·금액) / 노무비(단가·금액) / 계 / 비고

**내역표(8-2):** 패널별 자재·노무 세부 내역

```
패널 구성 예시 (템플릿 기준):
  HV-1 (LBS PANEL)
  HV-2 (MOF PANEL)
  HV-3 (PT PANEL)
  HV-4 (VCB PANEL)
  TR-1,2 (변압기 용량 기준)
```

> ✅ **구현 방식 확정**: 시스템은 상용부하 값만 엑셀 시트에 입력. 패널 구성·수량·자재 단가 산정은 엑셀 내장 수식으로 처리. 소스코드 로직 없음.

---

## 10. 공사비 실행검토 (시트: 4-6)

시스템 자동 산출 대상 아님. BOQ 생성 후 사용자가 직접 네고율·실행가를 입력하는 방식.

```
설계가(설계견적가) = Unit Price × Qty
설계가(관급계약가) = 설계견적가 × 네고가 적용율 (사용자 수동 입력, 기본값=1.0)
실행가             = 관급계약가 × 제안가 적용율 (기본값=1.0)
```

> GWD 프로젝트 기본값: 공법기자재=1.0, 일반기자재=1.0 ✅

---

## 11. 프로그램 구현 모듈 제안

```
BOQInputCollector
  → 공정/장비/구조물/전기계산서 완료 여부 확인
  → report.json 수신 (pipe_quantities, tray_quantity, building_structures)
  → elec_power_equip_list / elec_instrument_list 데이터 준비

MechanicalBOQCalculator
  → project_equipment_selections × equipment_catalog JOIN
  → 재료비 = invoice_price_KRW
  → 호표 매핑: s_primary_item_no_NONE → unit_price_list_machinery
  → 기계 총괄집계표(4-1) 생성

ElectricalBOQCalculator
  → WireQuantityAggregator
       케이블 규격별 합산 (동력 total_quantity + 계측기 quantity)
  → ConduitQuantityAggregator
       전선관 규격별 합산 + conduit 공유 규칙 적용 (conduit_power == conduit_control)
  → ConduitFittingDeriver
       conduit_fitting_equipment_spec 파생 산출
  → TrayQuantityProcessor
       tray_quantity 처리 + cable_tray_equipment_spec 파생 산출
  → TerminalQuantityDeriver
       compression_copper_terminal_spec 적용, field_type별 분기
  → MCCDerivedItemCalculator
       electric_control_equipment_spec 파생 산출 (MCC/MCCB/SPD/MC/INVERTER)
  → LOPDerivedItemCalculator
       현장조작반 파생 산출

PipingBOQCalculator
  → pipe_quantities[] 처리
  → 형태A/B 분류 → 재질/구경/길이 매핑 ⚠️
  → 단중표(5-2) 적용: 배관 중량(ton) 산출
  → unit_price_list_plumbing 호표 매핑

CivilBOQCalculator
  → project_structure_selections × structures JOIN
  → custom_dimensions → 체적/면적 산출 ⚠️
  → maintenance_cost 단가 적용

ArchitecturalBOQCalculator
  → report.json.building_structures → 연면적 집계
  → 3,000,000원/㎡ × 연면적

MaintenanceCostCalculator
  → PowerCostCalculator
       설비별 동력×운전시간 → 기본요금/사용요금
       계약전력 = 수용동력 + building_load_percent 가산
  → ChemicalCostCalculator
       약품 수량(kg/일) × maintenance_cost[CHEM_*] × 365일
  → RepairCostCalculator
       공사비 파트별 × 0.001/0.005 경상수선비 산출

UnitPriceSheetGenerator
  → unit_price_list_machinery → 4-4, 4-5 시트
  → unit_price_list_plumbing → 5-3, 5-4 시트
  → electric_cable_unit_price → 6-3, 6-4 시트

BOQTotalAggregator
  → 파트별 공사비 합계 → 1. 총 공사비 시트

BOQTemplateExporter
  → MinIO r12.xlsx 템플릿 로드
  → 19개(+조건부 2개) 시트 데이터 주입
  → MinIO r12_작업완료.xlsx 저장
```

---

## 12. 검증 시나리오

### 12.1 GWD 프로젝트 (`019e4d2e`) — BOQ Excel 교차검증 ✅

**기계 파트:**

| 항목 | 검증 방식 | 기준값 |
|---|---|---|
| 일반기자재비 | `project_equipment_selections × equipment_catalog` 합산 | 84,400,000원 |
| 설치비 | 호표 매핑 후 노무비/경비 합산 | 1,648,235원 |
| 기계 공사비 계 | 기자재+설치 합산 | 86,048,235원 |

**전기 파트:**

| 항목 | 기준값 | 검증 포인트 |
|---|---|---|
| F-CV 2.5SQ 3C | 150M | std_distance_m × total_quantity 합산 결과 ✅ |
| F-GV 4SQ | 609M | std_distance_m × total_quantity 합산 결과 ✅ |
| 강제전선관 28C | 306M | conduit 공유 규칙 (M-101~204) + 계측기 FIT-2301/2101 합산 ✅ |
| 강제전선관 22C | 48M | M-202 제어(38m×1) + 계측기 LIT-1001(거리⚠️) 합산 |
| 전기·계측제어 공사비 계 | 102,230,000원 | 전선+전선관+트레이+단자+MCC/LOP 전체 합산 ✅ |

**conduit_length_m 실데이터 패턴 (GWD 기준):**

| 장비 | std_distance_m | conduit_length_m | 차이 |
|---|---|---|---|
| MCC1 TITLE | 30.00 | NULL | (전선관 없음) |
| M-101 | 18.00 | 17 | -1m |
| M-102 | 31.00 | 29 | -2m |
| M-203 | 35.00 | 33 | -2m |
| M-205 | 46.00 | 44 | -2m |

> conduit_length_m = std_distance_m - (트레이 구간 1~2m) 패턴 확인.  
> 정확한 차감 로직은 소스코드 확인 필요 ⚠️

**유지관리비 파트:**

| 항목 | 기준값 | 산출식 |
|---|---|---|
| 계약전력 | 32.62 kW | 수용동력 30.25 + 건축부하 2.37 |
| 전력비 기본요금 | 3,256,781원/년 | 32.62 × 8,320 × 12 |
| 전력비 사용요금 | 29,467,326원/년 | 823.8kWh/일 × 98 × 365 |
| 약품비 | 15,384,770원/년 | 폴리머(고상) 5.335kg/일 × 7,900원/kg × 365일 |
| 슬러지처리비 | 163,241,231원/년 | 2.9816ton/일 × 150,000원/ton × 365일 |
| 경상수선비 | 3,004,468원/년 | (323.65+561.00)M×0.001 + (308.92+12.81+102.23)M×0.005 |
| **유지관리비 합계** | **214,354,576원/년** | |

**총 공사비:**

| 구분 | 금액 (백만원) |
|---|---|
| 토목 | 323.649 |
| 건축 | 561.000 |
| 기계 | 308.919 |
| 배관 | 12.815 |
| 전기·계측제어 | 102.230 |
| **공사비 계** | **1,308.612** |
| 유지관리비 합계 | 214.355 |

---

## 13. 미확정 항목

| # | 항목 | 우선순위 | 상태 |
|---|---|---|---|
| C-1 | `tray_quantity` 복수 트레이 시 배열 여부 | 높음 | ⚠️ 소스코드 확인 |
| C-2 | 전선·배관 재료비 외부 물가자료 연동 방식 및 페이지 매핑 | 높음 | ⚠️ 소스코드 확인 |
| C-3 | 배관 `pipe_code` 형태A/B 처리 방식 | 중간 | ⚠️ 이안 확인 |
| C-6b | 건축물 면적 데이터 수신 구조 (`building_structures`) | 낮음 | ⚠️ 소스코드 확인 |
| C-12 | 계측기 전선관 길이 산출 방식 | 높음 | ⚠️ `elec_instrument_list`에 거리 컬럼 없음. 소스코드 확인 |

**확정 완료 항목 (이력):**

| # | 항목 | 근거 |
|---|---|---|
| C-4 | MCC 파생 품목 전체 산식 | `electric_control_equipment_spec` DB 전체 확인 ✅ |
| C-4a | 토목 단가 전체 | `maintenance_cost` DB 전체 확인 ✅ |
| C-5 | 토목 수량 치수 입력 구조 | W/L/H = 사용자 지정값 전달. 체적·면적·여유율 계산은 엑셀 내장 수식 ✅ |
| C-6 | 건축 단가 3,000,000원/㎡ | `maintenance_cost.ArchitecturalConstructionCost` ✅ |
| C-7 | 공사비 실행검토(4-6) 계산 로직 | 소스코드 로직 없음. 엑셀 내장 수식. 시스템은 설계견적가만 전달 ✅ |
| C-8 | 전력 단가 | `maintenance_cost` ELECT_BMC=8,320원/kW·월, ELECT_UF=98원/kWh ✅ |
| C-9 | 약품비/용수비/슬러지 단가 | `maintenance_cost` CHEM_*/WATER_TARIFF/SLUDGE_UP ✅ |
| C-9b | 경상수선비 산출 기준 | 토건×0.001 + 기배전×0.005, BOQ 역산 검증 ✅ |
| C-10 | 인력 직종별 노임단가 | 관리자 Excel 수동 갱신. 자동화 범위 제외 ✅ |
| C-11 | 수변전설비 구성 로직 | 상용부하값만 시트 전달, 나머지(패널구성/자재단가) 엑셀 내장 수식 ✅ |
| C-13 | 약품비/슬러지 수량 데이터 원천 | `report.json` `OPX.{type}_{n}` 키 (형식: `name: MAINTF_code_key, value: 수량/일, unit: ??{단위}`) ✅ |
| C-14 | 공법 기자재 분류 기준 | `equipment_catalog.specifications.remark.value = "공법"/"일반"`. 공법 열 Excel 수식으로 집계 ✅ |

---

## 14. 소스코드 확인 시 우선 검색 키워드

```
r12
r12_작업완료
BOQGenerator
BOQ
boq
pipe_quantities
tray_quantity
building_structures
conduit_fitting_equipment_spec
cable_tray_equipment_spec
electric_control_equipment_spec
compression_copper_terminal_spec
unit_price_list_machinery
unit_price_list_plumbing
electric_cable_unit_price
maintenance_cost
invoice_price_KRW
s_primary_item_no
pipe_code
FIT_STRAIGHT
FIT_FLNG
has_substation
building_load_percent
ROUNDUP
material_cost
conduit_length_m
tray_quantity
```
