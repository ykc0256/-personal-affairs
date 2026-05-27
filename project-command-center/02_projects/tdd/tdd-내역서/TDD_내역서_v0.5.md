# TDD — 내역서(BOQ) 생성 규칙 v0.5

작성일: 2026-05-22  
작성자: 최윤규  
상태: 초안 (실제 BOQ·DB 기반 전체 시트 반영 완료 · DB 확정 ✅ / 소스코드 확인 필요 ⚠️ 구분)

> v0.5 변경 (v0.4 대비): 전선관 수량 산출 공식 실데이터 검증 완료 —  
> - 섹션 3-2 전선관 공식 상세화 (conduit 공유 규칙, TITLE 제외, 계측기 wal_distance/block_distance 사용)  
> - C-9b 경상수선비 공식 확정 ✅ (토목/건축 × 0.001 + 기계/배관/전기 × 0.005, BOQ 역산 검증)

> v0.4 변경 (v0.3 대비): DB 직접 조회로 미확인 항목 5건 해결 —  
> - C-4 MCC Name Plate 산식 수정 (MCC 면수 × 3 → SPD → NAME PLATE × 1EA)  
> - C-5 토목 단가 전체 `maintenance_cost` DB 확정 ✅  
> - C-6 건축 단가 3,000,000원/㎡ `maintenance_cost` DB 확정 ✅  
> - C-8 전력 단가 `maintenance_cost.ELECT_BMC/ELECT_UF` DB 확정 ✅  
> - C-9 약품비·용수비·슬러지처리비 단가 `maintenance_cost` DB 확정 ✅  
> - 섹션 3-5 MCC 파생품목 테이블 전면 재작성 (PVC DUCT, NAME PLATE, FUSE&HOLD, CONDENSER 코드 포함)

---

## 1. 개요

### 1-1. 목적

공정·장비·구조물 선택 및 전기설계 계산 완료 후 **내역서(BOQ) xlsx 파일**을 자동 생성한다.  
이 문서는 수량 산출 로직과 내역서 시트 구성 규칙을 정의한다.

### 1-2. MinIO 파일 경로 (확정) ✅

| 구분 | 경로 |
|---|---|
| 결과 파일 | `wai-project/{project_id}/result/kr/metric/r12_작업완료.xlsx` |
| 템플릿 파일 | `wai-project/{project_id}/template/kr/metric/r12.xlsx` |

### 1-3. BOQ 시트 목록 (실제 파일 기준 — 19개 시트) ✅

> **기준 프로젝트: GWD (`019e4d2e-dc83-7154-b1fe-f647b35dbcac`)**  
> MinIO: `wai-project/019e4d2e-dc83-7154-b1fe-f647b35dbcac/result/kr/metric/r12_작업완료.xlsx`  
> 사용자 제공 파일: `내역서 산출을 위한 기초자료__BOQ.xlsx` (동일 파일 로컬 복사본) — DB·MinIO·Excel 전항목 교차검증 완료 ✅

| # | 시트명 | 설명 | 컬럼 구성 | 데이터 출처 | 상태 |
|---|---|---|---|---|---|
| 1 | **1. 총 공사비** | 공사비 + 연간 유지관리비 총괄 | 구분/금액/비고 (백만원 단위) | 각 시트 합산 | ✅ |
| 2 | **2-1. 토목내역서** | 토목 기자재+설치 통합 1개 시트 | 구분/단위/수량/단가(원)/금액(원)/비고 | `project_structure_selections` | ⚠️ 수량 산출 공식 확인 필요 |
| 3 | **3-1. 건축내역서** | 건축 기자재+설치 통합 1개 시트 | 공종/단위/단가(원)/건축공사비(원)/비고 + 동명·연면적 면적산출 테이블 | 3D 건축물 배치 면적 데이터 | ⚠️ 소스코드 확인 필요 |
| 4 | **4-1. 기계 총괄 집계표** | 기계공사비 총괄 (일반기자재/설치/공법) | Item/Spec/Qty/Unit/합계/재료비/노무비/경비 | 4-2·4-3 합산 | ✅ |
| 5 | **4-2. 기자재내역서(기계)** | 기계·설비 기자재 | Tag No./Item/Spec/Qty/Unit/합계/재료비/노무비/경비/Remark/출처 | `project_equipment_selections` + `equipment_catalog` | ✅ |
| 6 | **4-3. 설치비내역서(기계)** | 기계·설비 설치비 | Tag No./Item/Spec/Qty/Unit/단위중량(ton)/합계/재료비/노무비/경비/Remark/출처(호표N) | `unit_price_list_machinery` (호표 기준) | ✅ |
| 7 | **4-4. 일위대가목록(기계)** | 기계 설치 호표 요약 목록 | No./Item/Spec/Qty/Unit/재료비/노무비/경비/비고 | `unit_price_list_machinery` | ✅ |
| 8 | **4-5. 일위대가(기계)** | 기계 호표별 노무 세부 내역 | No./Item/Spec/Qty/Unit/총액/재료비/노무비/경비 (인력·공구손료 세분) | `unit_price_list_machinery` 세부 | ✅ |
| 9 | **4-6. 공사비 실행검토** | 기계 설계가·관급계약가·제안가·실행가 비교 | Tag No./Item/Spec/Qty/Unit/UnitPrice/설계가/관급계약가/제안가/실행가/Remark | 4-2 기반 + 협상가율 | ⚠️ 네고율 적용 방식 소스코드 확인 |
| 10 | **5-1. 배관공사비** | 배관 기자재+설치 통합 | Item/Spec/Unit/Qty/총액/재료비/노무비/경비/Remark/출처(물가자료·호표) | `report.json.pipe_quantities[]` + `unit_price_list_plumbing` | ✅ (3D 없으면 빈 시트) |
| 11 | **5-2. 단중표** | 배관 관종·구경별 단위중량 참조표 | 일위대가적용/구경(mm)/스케줄(SCH)/단위중량(kg/m)/비고 | 고정 기준정보 | ✅ |
| 12 | **5-3. 일위대가목록(배관)** | 배관 설치 호표 요약 목록 | No./Item/Spec/Qty/Unit/재료비/노무비/경비/비고 | `unit_price_list_plumbing` | ✅ |
| 13 | **5-4. 일위대가(배관)** | 배관 호표별 노무 세부 내역 | No./Item/Spec/Qty/Unit/총액/재료비/노무비/경비 (인력·공구손료 세분) | `unit_price_list_plumbing` 세부 | ✅ |
| 14 | **6-1. 기자재내역서(전기)** | 전기 기자재 (재료비: 물가자료 기준) | Item/Spec/Qty/Unit/합계/재료비/노무비/경비/Remark/출처(물가자료 페이지) | `elec_power_equip_list` + `elec_instrument_list` | ✅ |
| 15 | **6-2. 설치비내역서(전기)** | 전기 설치비 (노무비/경비만) | Item/Spec/Qty/Unit/합계/재료비/노무비/경비/Remark/출처(호표N) | `electric_cable_unit_price` | ✅ |
| 16 | **6-3. 일위대가목록(전기)** | 전기 설치 호표 요약 목록 | No./Item/Spec/Qty/Unit/재료비/노무비/경비/비고 | `electric_cable_unit_price` | ✅ |
| 17 | **6-4. 일위대가(전기)** | 전기 호표별 노무 세부 내역 | No./Item/Spec/Qty/Unit/총액/재료비/노무비/경비 (인력·공구손료 세분) | `electric_cable_unit_price` 세부 | ✅ |
| 18 | **7-1. 유지관리비내역서** | 연간 유지관리비 4개 항목 | 전력비/약품비/용수비/슬러지처리비/경상수선비/에너지소모비 | `7-2. 전력비` 시트 결과 + 기준정보 | ⚠️ 약품·용수·슬러지 데이터 출처 확인 |
| 19 | **7-2. 전력비** | 기기별 전력 사용량 및 요금 산출 | 기기명/대수/동력(kW)/소요용량/수용율/계약전력/운전시간/사용전력/단가/전력비/기본요금/사용요금 | `project_equipment_selections` + 전력 단가 기준 | ⚠️ 기본·사용요금 단가 출처 확인 |
| 20 | **8-1. 총계표(수변전설비)** | 수변전설비 패널별 재료비+노무비 총계 | NO./품명/규격/단위/수량/재료비(단가·금액)/노무비(단가·금액)/계/비고 | 수변전설비 기준정보 + 변압기 용량 | **조건부: 수변전설비 있을 때만 생성** |
| 21 | **8-2. 내역표(수변전설비)** | 패널별 자재·노무 세부 내역 | NO./품명/규격/단위/수량/재료비(단가·금액)/노무비(단가·금액)/계/비고 | 수변전설비 기준정보 | **조건부: 수변전설비 있을 때만 생성** |

> **시트 생성 조건:**
> - 기본 생성: 1~19번 시트 (모든 프로젝트)
> - 조건부 생성: 20~21번 시트 (수변전설비 있을 때만)
>   - 조건: `projects.has_substation = true` — 사용자가 전기설계 설정 화면에서 직접 선택하는 항목 ✅
> - 배관 관련 시트(5-1~5-4): 3D 라우팅 완료 프로젝트만 데이터 존재 (미완료 시 빈 시트 생성)

> **수정 이력 (v0.2 → v0.3):**  
> - 기존 "공사 개요(2번)" 시트 없음 → 삭제  
> - 토목: 기자재/설치 2개 시트 → `2-1. 토목내역서` 통합 1개  
> - 건축: 기자재/설치 2개 시트 → `3-1. 건축내역서` 통합 1개  
> - 기계: 4-1 총괄집계표, 4-4 일위대가목록, 4-5 일위대가, 4-6 공사비실행검토 신규 추가  
> - 배관: 5-1은 기자재+설치 통합, 5-2 단중표, 5-3 일위대가목록, 5-4 일위대가 신규 추가  
> - 전기: 6-3 일위대가목록, 6-4 일위대가 신규 추가  
> - 유지관리비: 7-1 유지관리비내역서, 7-2 전력비 신규 추가

### 1-4. report.json 구조 (확정) ✅

MinIO 경로: `wai-project/{project_id}/report.json`

**pipe_quantities (배관 내역)**
```json
"pipe_quantities": [
  {
    "fitting_type": "FIT_STRAIGHT",
    "pipe_code": "STS 304",
    "diameter": 80,
    "schedule": "SCH10",
    "quantity": 36.437,
    "unit": "m"
  },
  {
    "fitting_type": "FIT_FLNG",
    "pipe_code": "KSD3576_STS304_VM_0000_80_10_FIT_FLNG_J_FLANGE",
    "diameter": 80,
    "schedule": "",
    "quantity": 7,
    "unit": "EA"
  }
]
```
> `pipe_code` 형태 두 가지 혼재: 단순 재질 표기(`"STS 304"`) / equipment_code 형태. ⚠️ 매핑 방식 이안 확인 필요.

**tray_quantity (케이블트레이)**
```json
"tray_quantity": {
  "electrical_code": "E_TRA0101_VM_SEOYOUNG_500",
  "specification": "W500*100H*2.3t",
  "quantity": 20,
  "unit": "EA"
}
```
> 단일 객체 구조 확인 ✅. ⚠️ 트레이 복수 종류 시 배열 여부 소스코드 확인 필요.

### 1-5. 금액 계산 공식 (확정) ✅

```
재료비 금액 = ROUNDUP(수량 × 재료비 단가, 0)
노무비 금액 = ROUNDUP(수량 × 노무비 단가, 0)
경비 금액   = ROUNDUP(수량 × 경비 단가, 0)
합계        = 재료비 금액 + 노무비 금액 + 경비 금액
```

---

## 2. 수량 산출 — 기계 파트

### 2-1. 데이터 출처

| 항목 | DB 테이블 / 필드 |
|---|---|
| 장비 목록 | `project_equipment_selections.equipment_id` |
| 장비 수량 | `project_equipment_selections.quantity` |
| 장비명 / 사양 | `equipment_catalog.specifications.productnm`, `.easpecific` |
| 장비 단가 | `equipment_catalog.output_values.invoice_price_KRW` |

### 2-2. BOQ 행 생성 규칙

1. `project_equipment_selections`에서 해당 프로젝트의 모든 장비 조회
2. `equipment_catalog`에서 JOIN하여 명세 조회
3. 수량 × 단가 = 금액 계산

### 2-3. 설치비 내역서 단가 매핑 (확정) ✅

`equipment_catalog.specifications.s_primary_item_no_NONE` 값이 호표 번호.  
이 필드가 없거나 null이면 해당 장비의 설치비 없음.

```
장비.s_primary_item_no_NONE → unit_price_list_machinery 호표 조회 → 노무비/경비 적용
```

---

## 3. 수량 산출 — 전기 파트

### 3-1. 전선 수량

**출처:** `elec_power_equip_list` + `elec_instrument_list`

**케이블 길이 원천 (확정)** ✅  
`std_distance_m`은 3D 경로 기반 실제 경로 길이.  
3D 라우팅 결과 → 전기계산서 → `std_distance_m` 순으로 반영되는 구조.

**산출 공식:**
```
전선 수량(M) = SUM(std_distance_m × total_quantity)   ← elec_power_equip_list
             + SUM(std_distance_m × quantity)          ← elec_instrument_list
             규격별 grouping (cable_cv / cable_cvv / cable_gv 등)
total_quantity = normal_count + spare_count
```

동일 규격 전선은 합산하여 한 행으로 표시.

> **계측기 포함 필수**: `elec_instrument_list`의 cable_cv(CV), cable_gv(GV), plc_cable_cvv_sb(CVV-SB) 케이블도 동일 공식으로 계산 후 합산. 동일 규격끼리 합산.  
> 실데이터 검증 ✅ (F-CV 2.5SQ 3C=150M, F-GV 4SQ=609M, F-CVV-SB 4종 전부 일치)

---

### 3-2. 전선관 및 부속품 수량

**출처:** `elec_power_equip_list.conduit_power`, `.conduit_control`, `.conduit_length_m`  
계측기 추가: `elec_instrument_list.conduit_size`, `.wal_distance`, `.block_distance`

**강제전선관 수량 — 동력 (elec_power_equip_list):**

```
ITEM type 장비별:
  동력 전선관(M) = conduit_length_m × normal_count   (규격 = conduit_power)
  제어 전선관(M) = conduit_length_m × normal_count   (규격 = conduit_control)

  ※ conduit_power = conduit_control 이면 → 동력·제어 케이블이 같은 전선관 공유
                                              전선관 1본만 계산 (중복 합산 안 함) ✅
  ※ TITLE type (MCC그룹 헤더): 제어 전선관 제외 — MCC 내부 결선이므로 현장 전선관 미시공 ✅

전체 합산:
  강제전선관(규격별) = Σ 각 장비의 해당 규격 전선관 길이
```

**강제전선관 수량 — 계측기 (elec_instrument_list):**

```
계측기 전선관 규격: elec_instrument_list.conduit_power, conduit_control
계측기 전선관 길이 출처: ⚠️ elec_instrument_list에 거리 컬럼 없음 — 소스코드 확인 필요
  (cable std_distance_m=30m 고정과 별개로 conduit에 사용되는 거리값 존재)
```

> **conduit 공유 규칙 검증 ✅ (019e4d2e 프로젝트 기준):**  
> - 22C BOQ=48M: M-202 제어(conduit_control=22C, 38m×1) + 계측기 LIT-1001(conduit_control=22C, 거리⚠️) 합산  
> - 28C BOQ=306M: M-101/102/103/203/204 동력=제어 공유(각 1본) + 계측기 FIT-2301/2101(conduit_power=conduit_control=28C, 거리⚠️) 합산  
> - 36C, 54C: 공유 없음 → BOQ 일치 ✅  
> ⚠️ 계측기 전선관 거리값 산출 방식은 소스코드 확인 필요 (DB 미저장)

> 예비 장비 전선관 미시공 — `normal_count`/`normal_quantity`만 사용.

**파생 품목 산식 — DB 확정 (conduit_fitting_equipment_spec) ✅**

모든 프로젝트에 동일하게 적용되는 고정값. 규격별 계수 동일.

| 파생 품목 | 코드 | 품명 | 규격 | 산식 |
|---|---|---|---|---|
| 노말밴드 | E_CON0102_VM_0000_{규격} | 노말밴드 | - | 강제전선관(M) × 1/12 |
| 가요전선관 1종 | E_CON0201_VM_0000_{규격} | 가요전선관 1종 | - | 강제전선관(M) × 1/6 |
| 박스커넥터 | E_CON0202_VM_0000_{규격} | 박스커넥터 | - | 강제전선관(M) × 1/6 |
| 동력배관지지가대 | E_EET0101_VM_0000 | 동력배관지지가대 | 2.3T 용융아연 | 강제전선관(M) × 0.0267 |
| 셋트앵커 | E_EET0102_VM_0000 | 셋트앵커 | 3/8" | 강제전선관(M) × 0.1067 |
| U Channel 회로 | E_EET0127_VM_0000 | U Channel 회로 | 41×41×t2.6mm | 강제전선관(M) × 0.1333 |

---

### 3-3. 케이블트레이 수량

**출처:** `report.json.tray_quantity`

**본체 수량:**
```
케이블트레이 본체 수량(EA) = tray_quantity.quantity
규격 = tray_quantity.specification
```

**파생 품목 산식 — DB 확정 (cable_tray_equipment_spec) ✅**

| 파생 품목 | 코드 | 품명 | 산식 |
|---|---|---|---|
| JOINT CONNECTOR | E_EET0304_VM_0000 | 용융 케이블 트레이(JOINT CONNECTOR) 회로 | DB spec_quantity 기반 |
| HOLD DOWN CLAMP | E_EET0305_VM_0000 | 용융 케이블 트레이(HOLD DOWN CLAMP) 회로 | DB spec_quantity 기반 |
| 케이블 커버 | E_TRA0201_VM_SEOYOUNG_* | 케이블 커버 | **미설치 — 산출 제외** ✅ |

> 케이블 커버(E_TRA0201)는 설치하지 않으므로 내역서 산출 대상에서 제외.

---

### 3-4. 단자 수량

**출처:** `compression_copper_terminal_spec`

**field_type별 적용 규칙 (확정) ✅**

| field_type | 대상 | 단자 종류 | 수량 산식 |
|---|---|---|---|
| ITEM | 일반 장비 케이블 | 압착단자 (E_TRM0201) | 코어수 × 2EA |
| INSTRUMENT | 계측기 케이블 | 압착단자 (E_TRM0201) | 코어수 × 2EA |
| TITLE | MCC 피더 (16㎟ 이상 4C) | 동관단자 (E_TRM0101) 추가 | 코어수 × 2EA |
| TITLE | 소형 케이블 (3C 이하) | 동관단자 없음 | — |

> 예시: 4C 케이블 → 압착단자 8EA. 16㎟ 이상 4C 피더 케이블 → 동관단자 8EA 추가.

---

### 3-5. 전동기제어반 / 현장조작반 파생 품목

파생 산식은 모든 프로젝트 공통 고정값 (A-5 확정) ✅

**MCC 관련 — DB 확정 (`electric_control_equipment_spec`) ✅**

| 품목 | 코드 | 파생 기준 | 산식 |
|---|---|---|---|
| MCC | E_EET0103_VM_0000 | — | MCC 그룹 수 |
| PVC DUCT | E_EET0117_VM_0000_80 | MCC → 파생 | MCC 수량 × 1EA ✅ |
| MCCB | — | `elec_power_equip_list` 기반 | — |
| THERMINAL BLOCK | E_EET0126_VM_0000_{정격} | MCCB → 파생 | MCCB 수량 × 1EA ✅ |
| SPD | — | 배전반 전선/차단기 기준 | — |
| NAME PLATE | E_EET0118_VM_0000_500 | SPD → 파생 | SPD 수량 × 1EA ✅ |
| FUSE & HOLD | E_EET0108_VM_0000 | SPD → 파생 | SPD 수량 × 3EA ✅ |
| CONDENSER | E_CPC0201_VM_0000_10_440 | SPD → 파생 | SPD 수량 × 1EA ✅ |
| CT | — | 배전반 전선/차단기 기준 | — |

**현장조작반(LOP) 관련:**

LOP는 `equipment_catalog` 기준 회로 수별 선택 (E_EET0104_VM_0000_{회로수}).

| 품목 | 산식 |
|---|---|
| LOP (E_EET0104) | LOP 수량 (회로수별) |
| MCCB | LOP 수량 × 2 |
| PBL RED / GREEN / YELLOW | LOP 수량 × 1 |
| Selector Switch | LOP 수량 × 1 |
| Emergency Switch | LOP 수량 × 1 |
| 2구 콘센트 | LOP 수량 × 1 |
| Name Plate (현장조작반) | LOP 수량 × 1 |
| KIV Cable | LOP 수량 × 60M |
| 압착단자 | LOP 수량 × 48EA |
| Fan / Fan Cover | LOP 수량 × 1 |

> DB 확인 결과: NAME PLATE는 MCC 면수 기준이 아닌 **SPD에서 파생** (SPD 1개 → NAME PLATE 1EA). 기존 "MCC 면수 × 3" 산식은 오류였음.

---

### 3-6. 기자재 단가

**재료비 출처:** 외부 물가자료 연동 (DB `electric_cable_unit_price.material_cost` = NULL — BOQ-2 참조)  
**노무비/경비 출처:** `electric_cable_unit_price` 테이블

**GWD 프로젝트 실제 단가 (물가자료 25년9월호 기준):**

| 품목 | 규격 | 재료비(원/M) | 물가자료 페이지 | 노무비(원/M) | 경비(원/M) | 설치 호표 |
|---|---|---|---|---|---|---|
| F-CV | 2.5SQ 3C | 2,271 | 1075Page | **0** | 0 | — ⚠️설치비 없음 |
| F-CV | 35SQ 4C | 27,625 | 1075Page | 28,419 | 852 | 호표20 |
| F-CV | 4SQ 3C | 3,072 | 1075Page | 13,967 | 419 | 호표1 |
| F-CV | 4SQ 4C | 3,949 | 1075Page | 18,157 | 544 | 호표15 |
| F-CVV | 1.5SQ 6C | 2,962 | 1076Page | 10,627 | 318 | 호표36 |
| F-CVV | 1.5SQ 8C | 3,590 | 1076Page | 12,752 | 382 | 호표38 |
| F-CVV-SB | 1.5SQ 2C | 1,992 | 1076Page | 4,250 | 127 | 호표47 |
| F-CVV-SB | 1.5SQ 4C | 2,677 | 1076Page | 7,894 | 236 | 호표49 |
| F-GV | 4SQ | 1,172 | 1075Page | 2,735 | 82 | 호표62 |
| F-GV | 16SQ | 3,274 | 1075Page | 3,829 | 114 | 호표65 |
| 강제전선관 | 22mm | 4,200 | 1101Page | 36,107 | 1,083 | 호표91 |
| 강제전선관 | 28mm | 5,500 | 1101Page | 45,954 | 1,378 | 호표92 |
| 강제전선관 | 36mm | 6,900 | 1101Page | 65,649 | 1,969 | 호표93 |
| 가요전선관-노출 | 22mm 방수 | 850 | 1101Page | 36,107 | 1,083 | 호표101 |
| 가요전선관-노출 | 28mm 방수 | 1,100 | 1101Page | 45,954 | 1,378 | 호표102 |
| 가요전선관-노출 | 36mm 방수 | 2,200 | 1101Page | 65,649 | 1,969 | 호표103 |

> **F-CV 2.5SQ 3C 설치비 0원** ✅: 호표(unit_price_list)에 등록되지 않은 제품은 설치비 미확정 상태로 0원 처리됨. 호표 기반으로 설치비가 산출되는 구조이며, 호표 등록은 관리자가 수동으로 직접 추가하는 항목.  
> **물가자료 페이지 번호** ✅: DB `electric_cable_unit_price` 출처 컬럼 기반으로 산출 여부 결정됨. 출처 컬럼에 값이 있으면 해당 물가자료 페이지 번호가 BOQ 출처 컬럼에 표기됨.  
> **케이블트레이·MCCB·단자류**: GWD 프로젝트 BOQ에서 해당 재료비 확인 불가 — 별도 데이터 출처 확인 필요.

---

## 4. 수량 산출 — 토목 파트 (시트: `2-1. 토목내역서`)

**구조:** 기자재+설치 통합 1개 시트. 컬럼 = 구분/단위/수량/단가(원)/금액(원)/비고

**실제 항목 구성 (BOQ 파일 기준):**

| 대분류 | 항목 예시 |
|---|---|
| 토공 | 표토제거(T=20cm, ㎡), 터파기 5m이하/5m초과(㎥), 되메우기, 잔토처리 |
| 구조물공 | 무근콘크리트타설(기초), 철근콘크리트타설(벽체/슬라브), 합판거푸집(기초/슬라브), 유로폼(벽체), 시스템비계, 시스템동바리, 철근가공및조립, 방수(내부/외부) |
| 가시설·부대 | 가시설공(Sheet Pile), 부대비용(토공+구조물공+가시설 합계의 20%) |

### 4-1. 데이터 출처

| 항목 | DB 테이블 / 필드 |
|---|---|
| 구조물 규격 | `project_structure_selections.custom_dimensions` (W/L/H, m 단위) |
| 구조물 수량 | `project_structure_selections.quantity` |
| 구조물 종류 | `structures.name` |

### 4-2. 수량 산출

3D 환경에서 토목 수량을 지정할 경우 데이터가 생성되는 구조.  
`custom_dimensions: {"W": 6.6, "L": 6.6, "H": 6.0}` 형태에서 콘크리트 체적(m³), 거푸집 면적(m²) 등을 산출.

> ⚠️ 수량 산출 공식(체적·면적 계산 방식) 소스코드 확인 필요.  
> 기준 프로젝트(`1s1s1a1s`)에서 토목 BOQ 금액 = 0 (데이터 미입력 상태).

### 4-3. 토목 단가 기준 (`maintenance_cost` DB 확정 ✅)

| code_name | 항목명 | 단위 | 단가(원) |
|---|---|---|---|
| sitePreparationWorks | 표토제거 | ㎡ | 502 |
| excavation5mOrLess | 터파기 (5m이하) | ㎥ | 4,684 |
| excavationAbove5m | 터파기 (5m초과) | ㎥ | 6,792 |
| fillingWorks | 되메우기 | ㎥ | 6,736 |
| earthDisposal | 잔토처리 | ㎥ | 12,060 |
| plainConcreteFoundation | 콘크리트타설 (무근) | ㎥ | 18,695 |
| reinforcedConcreteSlab | 콘크리트타설 (철근, 슬라브) | ㎥ | 30,105 |
| reinforcedConcreteWall | 콘크리트타설 (철근, 벽체) | ㎥ | 30,105 |
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
| temporaryStructures | 가시설공 | m | 5,000,000 |

---

## 5. 수량 산출 — 건축 파트 (시트: `3-1. 건축내역서`)

**구조:** 기자재+설치 통합 1개 시트.

**실제 시트 구성 (BOQ 파일 기준):**
- 상단: 공종/단위/단가(원)/건축공사비(원)/비고
  - 건축공사비(원) = 면적(㎡) × 3,000,000원/㎡ (기준 단가)
- 하단: 건축물 면적 산출 테이블
  - 동명/연면적(W×L×지수)/적용면적(㎡)

**금액 산출:**
```
건축공사비 = 건축물 연면적(㎡) × 3,000,000원
```

**데이터 출처:** 3D 환경에서 건축물 배치 시 면적 데이터 자동 전달.  
`report.json.building_structures`에서 데이터 수신 예정 (기준 프로젝트에서 빈 배열 `[]`).

> 단가 3,000,000원/㎡: `maintenance_cost.ArchitecturalConstructionCost` (unit_of_measure=㎡) DB 확정 ✅  
> ⚠️ 건축물 면적 데이터 입력 방식(`report.json.building_structures` 수신 구조) 소스코드 확인 필요.

---

## 6. 수량 산출 — 배관 파트 (시트: `5-1. 배관공사비`)

**구조:** 기자재+설치 통합 1개 시트. 컬럼 = Item/Spec/Unit/Qty/총액/재료비/노무비/경비/Remark/출처

**실제 출처 표기 패턴 (BOQ 파일 기준):**
- 재료비: `물가자료25년9월호XXXX Page` 형태
- 설치비: `호표N` 형태 (`unit_price_list_plumbing` 기준)

**출처:** `report.json.pipe_quantities[]`

**3D 라우팅 완료 프로젝트:** `pipe_quantities[]`에 실제 데이터 존재.  
**3D 라우팅 미완료 프로젝트:** `pipe_quantities: []` → **배관 내역서 시트는 헤더만 있는 빈 시트로 생성** ✅

`pipe_code` 형태:
- 단순 재질 표기: `"STS 304"` → diameter + schedule로 규격 식별
- equipment_code 형태: `"KSD3576_STS304_VM_0000_80_10_FIT_STRAIGHT_J_WELD"` → 완전한 코드

> **형태 A (`"STS 304"`)** ✅: 배관 자동 라우팅 시 생성되는 직관(Straight pipe) 항목. diameter + schedule로 규격 식별.  
> **형태 B (equipment_code)** ✅: 프리셋에 등록된 피팅류 등 물품에 의해 생성. 완전한 equipment_code로 카탈로그 직접 조회 가능.

---

## 7. 일위대가목록 / 일위대가 시트 생성

기계(4-4/4-5), 배관(5-3/5-4), 전기(6-3/6-4) 각각 2개 시트씩 총 6개.  
**데이터 출처: 모두 DB 기준정보 → 자동 생성**

### 7-1. 일위대가목록 시트

컬럼: `No.` / `Item` / `Specification` / `Quantity` / `Unit` / `재료비` / `노무비` / `경비` / `비고`

| 파트 | DB 테이블 | 비고 |
|---|---|---|
| 기계 (4-4) | `unit_price_list_machinery` | 호표1~N, 일반기기설치/펌프설치 등 |
| 배관 (5-3) | `unit_price_list_plumbing` | 호표1~N, 관종×구경별 설치공사 |
| 전기 (6-3) | `electric_cable_unit_price` | 호표1~N, 케이블/전선관/트레이 등 |

### 7-2. 일위대가 시트

컬럼: `No.` / `Item` / `Specification` / `Quantity` / `Unit` / `총액` / `재료비` / `노무비` / `경비`  
(호표별로 인력 직종·투입량·단가·공구손료 세부 행 포함)

**금액 계산:** 인력투입량 × 노임단가 + 공구손료(노무비의 3%)

> **✅ 일위대가 운영 방식**: 일위대가는 참고용 산식. 직종별 노임단가는 수동 업데이트 항목이며, 관리자가 양식(Excel)을 통해 직접 갱신함. 연도 기준 갱신도 수동 진행. 자동화 범위 제외.

---

## 8. 기계 총괄 집계표 / 공사비 실행검토

### 8-1. 기계 총괄 집계표 (시트: `4-1`) ✅

**컬럼:** Item / Spec / Qty / Unit / 합계 / 재료비(단가·총액) / 노무비(단가·총액) / 경비(단가·총액) / Remark

**구성 (BOQ 파일 실데이터 기준):**
```
■ 1. 기계공사비
  1.1 일반 기자재비    1식  → 4-2 기자재내역서(기계) 합계
  1.2 일반기자재 설치비 1식  → 4-3 설치비내역서(기계) 합계
  1.3 공법 기자재비    1식  → 공법 장비 해당 시 (기준 프로젝트: 0원)
```

**샘플 데이터 (1s1s1a1s):**
- 일반 기자재비: 84,400,000원
- 일반기자재 설치비: 1,648,235원 (노무비 1,603,112원 포함)
- 기계공사비 합계: 86,048,235원

### 8-2. 공사비 실행검토 (시트: `4-6`) ✅

**컬럼:** Tag No. / Item / Spec / Qty / Unit / Unit Price / 설계가(설계견적가·금액) / 설계가(관급계약가·금액) / 제안가(건설사·금액) / 실행가(금액) / Remark

**네고율 설정 (BOQ 파일 기준):**
- 네고가 적용율(최초 설계가 대비): 공법기자재 = 1.0, 일반기자재 = 1.0
- 제안가 적용율: 공법기자재 = 1.0, 일반기자재 = 1.0

**구조:**
```
설계가(설계견적가) = Unit Price × Qty
설계가(관급계약가) = 설계견적가 × 네고가 적용율
실행가 = 설계가 × 제안가 적용율 (기본값: 관급계약가와 동일)
```

> **✅ 공사비 실행검토 시트는 사용자 수동 입력 항목**: 시스템 자동 산출 대상 아님. BOQ 생성 후 사용자가 해당 시트에서 네고율·실행가를 직접 입력하는 방식. GWD 프로젝트 기본값 1.0 (협상 결과 미반영).

---

## 9. 배관 단중표 (시트: `5-2`)

**컬럼:** 일위대가적용 / 구경(mm) / 스케줄(SCH) / 단위중량(kg/m) / 비고

**용도:** 배관 호표 적용 시 관 길이(m) → 중량(ton) 변환에 사용.  
`배관 중량(ton) = 배관 길이(m) × 단위중량(kg/m) / 1000`

**관종별 구성 (BOQ 파일 기준):**
- 일반 배관용 탄소 강관(SPP): 6A~600A
- STS304 배관 (SCH10): 구경별
- 기타 관종: 프로젝트 사용 관종에 따라 자동 포함

> 단중표는 고정 기준정보이므로 템플릿에 사전 정의. 자동 생성 불필요.

---

## 10. 유지관리비 / 전력비 시트

### 10-1. 유지관리비내역서 (시트: `7-1`)

**연간 유지관리비 6개 항목:**

| 항목 | 데이터 출처 | 단가 기준 | 상태 |
|---|---|---|---|
| 전력비 | `7-2. 전력비` 시트 결과 합계 | — | ✅ |
| 약품비 | 수량(kg/일)×단가(원/kg)×365 | `maintenance_cost` (CHEM_* code_name) | ✅ |
| 용수비 | 수량(㎥/일)×단가(원/㎥)×365 | `maintenance_cost.WATER_TARIFF` = 800원/㎥ | ✅ |
| 슬러지 처리비 | 발생량(ton/일)×단가(원/ton)×365 | `maintenance_cost.SLUDGE_UP` = 150,000원/ton | ✅ |
| 에너지 소모비 (LNG) | 사용량(N㎥/일)×단가(원/N㎥)×365 | `maintenance_cost.LNG_UP` = 1,420원/N㎥ | ✅ |
| 경상수선비 | 기준 프로젝트: 696,374원/년 | 토목/건축 × 0.001 + 기계/배관/전기 × 0.005 | ✅ BOQ 7-1 역산 확인 |

**약품비 단가 기준 (`maintenance_cost` DB 확정 ✅):**

| code_name | 약품명 | 단가(원/kg) |
|---|---|---|
| CHEM_FECL338 | 염화철 (FeCl3 38%) | 550 |
| CHEM_H2SO4 | 황산 (H₂SO₄) | 170 |
| CHEM_KH2PO4 | 제인산칼륨 (KH₂PO₄) | 6,046 |
| CHEM_MEOH | 메탄올 (CH₃OH) | 650 |
| CHEM_NAOH | 가성소다 (NaOH) | 100 |
| CHEM_PAC17 | PAC 17% | 330 |
| CHEM_PLMLQ | 폴리머 액체형 | 7,900 |
| CHEM_PLMSL | 폴리머 고체형 | 7,900 |

**GWD 프로젝트 실측값 (단위: 천원/년):**

| 항목 | 금액 | 비고 |
|---|---|---|
| 전력비 | 32,724.107 | 기본료 3,256.781 + 사용요금 29,467.326 |
| 약품비 | 15,384.770 | 폴리머(고상) 5.335kg/일 × 7,900원/kg × 365일 |
| 용수비 | 0 | 해당 없음 |
| 슬러지 처리비 | 163,241.231 | 2.9816ton/일 × 150,000원/ton × 365일 |
| 경상수선비 | 3,004.468 | 토목×0.001 + 건축×0.001 + 기계/배관/전기×0.005 |
| 에너지 소모비 | 0 | 해당 없음 |
| **유지관리비 합계** | **214,354.576** | **≒ 214.355백만원/년** |

### 10-2. 전력비 (시트: `7-2`)

**컬럼:** 구분/기기명/상용대수/예비대수/동력(kW/대)/소요용량(kW)/수용율(%)/계약전력(kW)/운전시간(hr/일)/사용전력(kWh/일)/단가(원/kWh)/전력비(원/일)/기본요금(원)/사용요금(원)

**데이터 출처:** `project_equipment_selections` (기기명, 동력, 상용/예비 대수)

**전력비 산출 공식:**
```
기본요금(원/년) = 계약전력(kW) × 기본요금단가(원/kW·월) × 12
사용요금(원/년) = 사용전력(kWh/일) × 사용요금단가(원/kWh) × 365
```

**단가 기준 (`maintenance_cost` DB 확정 ✅):**
- 기본요금 단가: 8,320원/kW·월 (`maintenance_cost.ELECT_BMC`)
- 사용요금 단가: 98원/kWh (`maintenance_cost.ELECT_UF`)

**GWD 프로젝트 실측값:**

| 구분 | 값 | 산출 |
|---|---|---|
| 계약전력 | 32.62 kW | 수용동력(부하일람표 30.25kW) + 건축부하 기여분(2.37kW) |
| 사용전력 | 823.8 kWh/일 | 장비별 운전시간 합산 |
| 기본요금 | 3,256,781원/년 | 32.62kW × 8,320원/kW·월 × 12월 |
| 사용요금 | 29,467,326원/년 | 823.8kWh/일 × 98원/kWh × 365일 |
| **전력비 합계** | **32,724,107원/년** | |

기기별 전력비 (주요):
- M-101 (1.5kW×2, 수용60%): 사용전력=0 (운전시간 미설정)
- M-102 (7.5kW×2, 수용80%): 360kWh/일 × 98원 = 35,280원/일
- M-103 (7.5kW×2, 수용80%): 360kWh/일 × 98원 = 35,280원/일
- M-205 (7.5kW×1, 수용60%): 75kWh/일 × 98원 = 7,350원/일

> 전력 단가 `maintenance_cost` DB 참조값으로 확정 ✅. 고정 하드코딩 아님 — DB 테이블 값 변경 시 자동 반영.  
> **✅ 계약전력 vs 수용동력 차이**: 계약전력에는 `projects.building_load_percent` 설정값에 따른 건축부하 분전반 용량이 추가 반영됨. 수용동력(부하일람표 MCC 집계값)과 달라질 수 있음. GWD 기준: 수용동력 30.25kW + 건축부하 2.37kW = 32.62kW.

---

## 11. 총 공사비 집계 (시트: `1. 총 공사비`)

**구성:** 공사비 합계 + 연간 유지관리비 합계 (단위: 백만원)

| 구분 | 데이터 출처 |
|---|---|
| 토목 | `2-1. 토목내역서` 합계 |
| 건축 | `3-1. 건축내역서` 합계 |
| 기계 | `4-1. 기계 총괄 집계표` 합계 |
| 배관 | `5-1. 배관공사비` 합계 |
| 전기·계측제어 | `6-1. 기자재내역서(전기)` + `6-2. 설치비내역서(전기)` 합계 |
| **공사비 계** | 위 합산 |
| 연간 유지관리비 — 전력비 | `7-2. 전력비` 합계 |
| 연간 유지관리비 — 약품비·용수비·슬러지·경상수선비 등 | `7-1. 유지관리비내역서` |
| **유지관리비 합계** | 전력비 + 기타 합산 |

**GWD 프로젝트 실측값 (`내역서 산출을 위한 기초자료__BOQ.xlsx` 기준, 단위: 백만원):**

| 구분 | 금액 (백만원) | 비고 |
|---|---|---|
| 토목 | 323.649 | |
| 건축 | 561.000 | 187㎡ × 3,000,000원/㎡ (탈수동93.5㎡ + 창고93.5㎡) |
| 기계 | 308.919 | |
| 배관 | 12.815 | |
| 전기·계측제어 | 102.230 | |
| **공사비 계** | **1,308.612** | |
| 전력비 | 32.724 | 32,724,107원/년 |
| 약품비 | 15.385 | 폴리머(고상) |
| 슬러지 처리비 | 163.241 | |
| 경상수선비 | 3.004 | |
| **유지관리비 합계** | **214.355** | |

---

## 11-A. 수변전설비 내역서 (조건부 시트)

**생성 조건:** 프로젝트에 수변전설비가 포함된 경우에만 생성.  
미포함 시 템플릿의 8-1·8-2 시트는 결과 파일에서 제외됨. ✅ (1s1s1a1s 프로젝트 기준 확인)

### 총계표(수변전설비) — 시트 `8-1`

**컬럼:** NO. / 품명 / 규격 / 단위 / 수량 / 재료비(단가·금액) / 노무비(단가·금액) / 계 / 비고

**패널 구성 예시 (템플릿 샘플 데이터):**

| NO. | 품명 | 비고(기준) |
|---|---|---|
| 1 | HV-1 (LBS PANEL) | 변압기 용량 기준 |
| 2 | HV-2 (MOF PANEL) | 100 |
| 3 | HV-3 (PT PANEL) | 200 |
| 4 | HV-4 (VCB PANEL) | 300 |
| 5 | TR-1,2 (0kVA/EACH) | 400 |

> ⚠️ 수변전설비 패널 구성 및 수량 결정 로직, 변압기 용량 기준 산출 방식 소스코드 확인 필요 (C-11).

### 내역표(수변전설비) — 시트 `8-2`

**컬럼:** NO. / 품명 / 규격 / 단위 / 수량 / 재료비(단가·금액) / 노무비(단가·금액) / 계 / 비고

**구조:** 패널별로 직접재료비 + 세부 자재 항목 상세

```
HV-1 (LBS PANEL)
  1. 직접재료비: 8,920,264원
  2. 외함(특고압반) | 1400Wx2500Hx2500D (26.50㎡) | 1면 | 4,360,840원
  3. DOOR HANDLE W/KEY (L) | 4개 | 5,690원
  4. DOOR HANDLE W/KEY (M) | 4개 | 4,170원
  ...
```

> ⚠️ 수변전설비 세부 자재 목록 및 단가 출처 소스코드 확인 필요 (C-11).

---

## 12. 내역서 생성 프로세스

```
[입력]
  project_equipment_selections (기계 — 기자재내역서/설치비내역서/총괄집계표/실행검토/전력비)
  project_structure_selections (토목)
  3D 건축물 면적 데이터 (report.json.building_structures, 건축)
  elec_power_equip_list (전기 규격·길이)
  elec_instrument_list (계측기)
  report.json.tray_quantity (케이블트레이)
  report.json.pipe_quantities[] (배관)
        ↓
[수량 산출 (섹션 2~10)]
  - 기계: equipment_catalog 기준 장비 리스트
  - 전기: 전선/전선관/트레이/단자/MCC/LOP 파생
    (conduit_fitting_equipment_spec / cable_tray_equipment_spec / compression_copper_terminal_spec)
  - 배관: pipe_quantities → pipe_code × 단중표(5-2) → 중량 산출
  - 건축: 연면적(㎡) × 3,000,000원/㎡
  - 토목: custom_dimensions 기반 체적·면적 산출 ⚠️
        ↓
[단가 조회]
  - 기계 재료비: equipment_catalog.output_values.invoice_price_KRW
  - 기계 설치비: unit_price_list_machinery (s_primary_item_no 호표 기준)
  - 전기 재료비: 외부 물가자료 ⚠️ (출처: 물가자료 XX년XX월호 XXXPage)
  - 전기 설치비: electric_cable_unit_price (노무비/경비, 재료비 NULL)
  - 배관 재료비: 외부 물가자료 ⚠️ (출처: 물가자료 XX년XX월호 XXXPage)
  - 배관 설치비: unit_price_list_plumbing (호표 기준)
  - 전력비 단가: 기본요금 8,320원/kW·월, 사용요금 98원/kWh ⚠️ 고정값 여부 확인
        ↓
[금액 계산]
  ROUNDUP(수량 × 단가, 0)
        ↓
[일위대가목록/일위대가 시트 생성]
  - 기계: unit_price_list_machinery → 4-4, 4-5
  - 배관: unit_price_list_plumbing → 5-3, 5-4
  - 전기: electric_cable_unit_price → 6-3, 6-4
        ↓
[유지관리비 산출]
  - 7-2 전력비: equipment 동력×운전시간 기반
  - 7-1 유지관리비내역서: 전력비 + 약품비/용수비/슬러지/경상수선비 합산
        ↓
[템플릿 xlsx 로드]
  MinIO wai-project/{project_id}/template/kr/metric/r12.xlsx
        ↓
[19개 시트 데이터 주입]
        ↓
[결과 xlsx 저장]
  MinIO wai-project/{project_id}/result/kr/metric/r12_작업완료.xlsx
```

---

## 13. 미확인 항목 (소스코드 확인 필요)

| # | 항목 | 우선순위 | 상태 |
|---|---|---|---|
| C-1 | `tray_quantity` 트레이 복수 종류 시 배열 vs 단일 객체 | 높음 | ⚠️ 소스코드 확인 |
| C-2 | 전선·배관 재료비 외부 물가자료 연동 방식 및 페이지 매핑 | 높음 | ⚠️ 소스코드 확인 |
| C-3 | 배관 `pipe_code` 두 가지 형태 처리 방식 | 중간 | ⚠️ 이안 확인 |
| C-4 | MCC Name Plate 산식 | — | ✅ SPD → NAME PLATE × 1EA, FUSE&HOLD × 3EA, CONDENSER × 1EA (`electric_control_equipment_spec` DB 확인) |
| C-5 | 토목 수량 산출 공식 (체적, 거푸집 면적) | 중간 | ⚠️ 소스코드 확인 (단가는 `maintenance_cost` DB ✅) |
| C-6 | 건축 3,000,000원/㎡ 단가 출처 | — | ✅ `maintenance_cost.ArchitecturalConstructionCost` DB 확인 |
| C-6b | 건축물 면적 데이터 입력 방식 (report.json.building_structures) | 낮음 | ⚠️ 소스코드 확인 |
| C-7 | 공사비 실행검토(4-6) 네고율 입력 방식 및 실행가 계산 로직 | 중간 | ⚠️ 소스코드 확인 |
| C-8 | 전력 단가 출처 | — | ✅ `maintenance_cost.ELECT_BMC`(8,320원/kW·월), `ELECT_UF`(98원/kWh) DB 확인 |
| C-9 | 약품비·용수비·슬러지처리비 단가 출처 | — | ✅ `maintenance_cost` DB 확인 (CHEM_*/WATER_TARIFF/SLUDGE_UP) |
| C-9b | 경상수선비 산출 기준 | — | ✅ 토목/건축 × 0.001 + 기계/배관/전기 × 0.005 (BOQ 7-1 역산으로 공식 확인. 검증: 323.65×0.001 + 561.00×0.001 + 308.92×0.005 + 12.81×0.005 + 102.23×0.005 = 3.004백만원 일치) |
| C-10 | 인력 직종별 노임단가 출처 및 연도 기준 | 낮음 | ⚠️ 소스코드 확인 |
| C-11 | 수변전설비 패널 구성/수량 산출 로직 및 세부 자재 단가 출처 | 중간 | ⚠️ 소스코드 확인 |

---

## 14. 참고 파일

| 파일 | 용도 |
|---|---|
| `tdd-내역서/내역서_DB_MinIO_교차검증.md` | DB/MinIO 교차검증 원본 결과 |
| `tdd-내역서/배관내역서_산출과정_분석.md` | 배관/전기 연계 내역 산출 Excel 원본 분석 |
| `tdd-내역서/TDD_내역서_미확정항목_확인용.md` | A~C 항목 질의·답변 원본 |
| MinIO `019e4d2e-dc83-7154-b1fe-f647b35dbcac/result/kr/metric/r12_작업완료.xlsx` | BOQ 최종 산출물 기준 **(21개 시트 — 19기본+수변전설비2, 최우선 기준 파일)** ✅ |
| MinIO `019e4d2e-dc83-7154-b1fe-f647b35dbcac/template/kr/metric/r12.xlsx` | BOQ 템플릿 (656KB, 시트 구조 기준) |
| MinIO `019e4d2e-dc83-7154-b1fe-f647b35dbcac/report.json` | pipe_quantities / tray_quantity / building_structures 구조 기준 |
| `내역서 산출을 위한 기초자료__BOQ.xlsx` (프로젝트 루트) | GWD BOQ 로컬 분석용 파일 (MinIO r12_작업완료.xlsx와 동일) |
| `99_reference/boq/originals/251217_내역서 산출과정 정리(배관)_r1.xlsx` | 배관/전기 연계 내역 산출 과정 원본 Excel |
| `tdd-전기설계/TDD_전기설계규칙_v0.2.md` | 전기 수량 산출 상세 (이 문서와 연계) |
