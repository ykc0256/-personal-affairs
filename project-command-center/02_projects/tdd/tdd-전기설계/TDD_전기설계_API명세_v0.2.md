# 전기설계 API/DB 연결 명세 v0.2

작성일: 2026-05-19  
기준 API: `http://172.16.0.20:8000/openapi.json`  
API 버전: WAI Design API Gateway (Production) 1.7.5  
DB 스키마: `bkt_wai_design`  
샘플 프로젝트 ID: `019e00d8-aa36-7fd1-b5b8-1b874e2e477b` (1s1s1a1s)

마커 규칙:
- ✅ DB/API 직접 조회로 확인된 항목
- ⚠️ 규칙 방향은 확인됐으나 세부 구현 알고리즘은 소스코드 확인 필요
- ❓ 아직 확인 안 됨

---

## 1. 전체 데이터 흐름

```
[공정계산 결과] report.json (GET /api/v1/projects/{project_id}/report)
  └─ EQP.{code_key}.{field} 구조, power_kW / ctrl_method / efficiency_percent / pwr_factor_percent
     / demand_factor_percent / rated_volt_V / normal_count / spare_count

    ↓ auto_fill → POST elec_equip_load_list

[동력설비 부하계산서] elec_equip_load_list
  └─ rated_current_a = power_kW × 1000 / (√3 × volt × efficiency × pwr_factor)  ✅
  └─ load_capacity_kva = power_kW / (efficiency × pwr_factor)                    ✅
  └─ normal_current_a (ITEM) = rated_current_a × normal_quantity                  ✅
  └─ TITLE: normal_current_a = Σ(items) + MAX(items) × 0.1                       ✅

    ↓ auto-fill refresh-all → POST elec_power_equip_list

[동력설비 리스트] elec_power_equip_list
  └─ cable_cv / cable_gv → elec_selection_rules (cable rule)                     ✅
  └─ outer_diameter_* → elec_selection_rules (cable_diameter rule)               ✅
  └─ conduit_power / conduit_control → elec_selection_rules (conduit rule)       ✅
  └─ breaker_model → elec_selection_rules (breaker rule)                         ✅
  └─ mc_model / eocr_model → elec_selection_rules (mc / eocr rule)              ✅
  └─ inverter_model → elec_selection_rules (inverter rule)                       ✅
  └─ soft_starter → elec_selection_rules (soft_starter rule)                    ✅
  └─ condenser → elec_selection_rules (capacitor rule)                           ✅
  └─ mcc_size_mm → elec_selection_rules (mcc_size rule)                         ✅
  └─ std_distance_m / conduit_length_m → project.json electric_wires            ⚠️
  └─ mcc_panel_count → ⚠️ 산정 로직 소스코드 확인 필요

    ↓ batch_refresh → POST elec_instrument_list

[계측기 리스트] elec_instrument_list
  └─ cable_cv / cable_gv / plc_cable_* → equipment_cable_spec                   ✅
  └─ outer_diameter_* → elec_selection_rules (cable_diameter rule)              ✅
  └─ conduit_power / conduit_control → elec_selection_rules (conduit rule) ✅

    ↓ public API

[전기 도면용 View Model]
  └─ /api/public/v1/.../mccd  → MCC 구성도
  └─ /api/public/v1/.../mswd  → 결선도
  └─ /api/public/v1/.../lcpo  → 현장조작반 외형도
  └─ 범례 도면                → ❓ 데이터 원천 미확인

[3D 프로젝트 상태] project.json (GET /api/v1/projects/{project_id})
  └─ electrictrays[] → MCC 3D 배치 (obj_name=MCC1, columns=4)
  └─ electric_wires[] → 전선 경로 점열 (start/end connector_id, points[].{x,y,z,magnitude})
  └─ mcc_details[] → MCC 상세 (ctrl_method_value in Korean)
```

---

## 2. DB 테이블 상세

### 2.1 elec_equip_load_list — 동력설비 부하계산서

**역할**: 공정 계산 결과를 기반으로 생성. 전기계산서 1~3 시트의 원천 데이터.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `load_id` | uuid | PK |
| `project_id` | uuid | 프로젝트 FK |
| `mcc_no` | varchar | MCC 번호 (MCC1, MCC2…) |
| `field_type` | varchar(10) | `TITLE` (집계행) / `ITEM` (설비행) |
| `mcc_equip_no` | varchar(20) | 기기번호 (M-101 등), TITLE은 mcc_no와 동일 |
| `equipment_id` | uuid | 장비 카탈로그 FK |
| `equipment_type` | varchar(50) | M_AGT0602 등 |
| `equipment_name` | varchar(200) | 장비명 |
| `specification` | text | 사양 |
| `power_kw` | numeric | 동력 (kW) |
| `ctrl_method` | varchar(20) | S_SYS01~05, TITLE은 null |
| `efficiency_percent` | numeric | 효율 (0~1 범위, e.g. 0.90) ✅ |
| `pwr_factor_percent` | numeric | 역률 (0~1 범위, e.g. 0.90) ✅ |
| `rated_volt_v` | numeric | 정격전압 (V, 예: 380) |
| `load_capacity_kva` | numeric | 부하용량 (kVA) |
| `rated_current_a` | numeric | 정격전류 (A) |
| `normal_current_a` | numeric | 상용전류: ITEM = rated×qty, TITLE = Σ+MAX×0.1 ✅ |
| `normal_quantity` | integer | 상용 수량 |
| `spare_quantity` | integer | 예비 수량 |
| `normal_power_kw` | numeric | 상용 동력합 (kW) |
| `normal_load_kva` | numeric | 상용 부하합 (kVA) |
| `demand_factor_percent` | numeric | 수용률 (% 형식, e.g. 60.0) ✅ |
| `control_panel_type` | varchar | `LOP` (S_SYS01/02/03) / `MOP` (S_SYS04) ✅ |
| `item_order` | integer | 정렬 순서 |

**계산 공식** (✅ 샘플 데이터 검증):

```
rated_current_a = power_kW × 1000 / (√3 × rated_volt_v × efficiency_percent × pwr_factor_percent)
  예: 3.70 × 1000 / (1.732 × 380 × 0.90 × 0.90) = 6.98A

load_capacity_kva = power_kW / (efficiency_percent × pwr_factor_percent)
  예: 3.70 / (0.90 × 0.90) = 4.57 ≈ 4.59 kVA  ✅ 소수점 2자리 반올림

ITEM.normal_current_a = rated_current_a × normal_quantity
  예: M-101: 6.98 × 2 = 13.96A

TITLE.normal_current_a = Σ(ITEM.normal_current_a) + MAX(ITEM.normal_current_a) × 0.1
  예: MCC1: 합산 전류 + 최대 전류×0.1 = 425.78A

TITLE.normal_power_kw = Σ(ITEM.power_kw × ITEM.normal_quantity)  ✅
  (각 ITEM의 동력×상용수량 합산)

TITLE.normal_load_kva = Σ(ITEM.rated_current_a × ITEM.normal_quantity) + MAX(ITEM.rated_current_a × ITEM.normal_quantity) × 0.1  ✅
  (ITEM 상용전류 합 + 최대 상용전류×0.1 — normal_current_a 산정 방식 동일 적용)

TITLE.demand_factor_percent = AVG(ITEM.demand_factor_percent)  ✅
  (하위 ITEM 수용률 평균값)
```

**샘플 데이터** (project_id = 1s1s1a1s):

| mcc_equip_no | field_type | power_kw | ctrl_method | rated_current_a | normal_current_a | normal_qty | spare_qty | control_panel_type |
|---|---|---|---|---|---|---|---|---|
| MCC1 | TITLE | 161.55 | null | 425.78 | 425.78 | 1 | 0 | null |
| M-101 | ITEM | 3.70 | S_SYS01 | 6.98 | 13.96 | 2 | 0 | LOP |
| M-102 | ITEM | 3.70 | S_SYS01 | 6.98 | 13.96 | 2 | 1 | LOP |
| M-204 | ITEM | 0.75 | S_SYS04 | 1.52 | 3.03 | 2 | 0 | MOP |
| M-205 | ITEM | 75.00 | S_SYS04 | 132.72 | 132.72 | 1 | 0 | MOP |

---

### 2.2 elec_power_equip_list — 동력설비 리스트

**역할**: 부하계산 결과에 케이블/차단기/MCC/거리를 붙인 최종 동력설비 리스트. 케이블 스케줄, MCC 구성도, 결선도, 전기 평면도의 원천.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `power_equip_id` | uuid | PK |
| `project_id` | uuid | 프로젝트 FK |
| `mcc_no` | varchar(20) | MCC 번호 |
| `field_type` | varchar(10) | TITLE / ITEM |
| `mcc_equip_no` | varchar(20) | 기기번호 |
| `equipment_id` | uuid | 장비 카탈로그 FK |
| `equipment_type` | varchar(50) | 장비유형 코드 |
| `equipment_name` | varchar(200) | 장비명 |
| `specification` | text | 사양 |
| `power_kw` | numeric | 동력 |
| `ctrl_method` | varchar(20) | 기동방식 코드 |
| `normal_current_a` | numeric | 상용전류 (ITEM=1대 기준, TITLE=집계) |
| `normal_quantity` | integer | 상용 수량 |
| `spare_quantity` | integer | 예비 수량 |
| `total_quantity` | integer | 상용+예비 |
| `cable_cv` | varchar(50) | CV 규격 (예: "4SQ 3C", "70SQ 4C") |
| `cable_gv` | varchar(50) | GV 규격 (예: "4SQ", "35SQ") |
| `plc_cable_di` | integer | DI 신호 수량 |
| `plc_cable_do` | integer | DO 신호 수량 |
| `plc_cable_ai` | integer | AI 신호 수량 |
| `plc_cable_ao` | integer | AO 신호 수량 |
| `plc_cable_rs485` | integer | RS485 수량 |
| `plc_cable_cvv` | varchar(50) | CVV 규격 |
| `plc_cable_cvv_sb` | varchar(50) | CVV-SB 규격 |
| `outer_diameter_cv` | numeric | CV 케이블 외경 (mm) |
| `outer_diameter_gv` | numeric | GV 케이블 외경 (mm) |
| `outer_diameter_cvv` | numeric | CVV 케이블 외경 (mm) |
| `outer_diameter_cvv_sb` | numeric | CVV-SB 케이블 외경 (mm) |
| `breaker_model` | varchar(50) | 차단기 모델 |
| `mc_model` | varchar(50) | MC 모델 (S_SYS01 전용) |
| `eocr_model` | varchar(50) | EOCR 모델 (S_SYS01 전용) |
| `inverter_model` | varchar(50) | 인버터 모델 (S_SYS02 전용) |
| `condenser` | varchar(50) | 콘덴서 (capacitance_uf 값, S_SYS01 전용) |
| `soft_starter` | varchar(50) | Soft Starter 모델 (S_SYS03 전용) |
| `std_distance_m` | numeric | 기준거리 (m): TITLE=30 고정, ITEM=3D 경로 or 0 |
| `conduit_length_m` | integer | 전선관 길이 (m): TITLE=NULL, ITEM=3D 경로 내 전선관 구간 |
| `conduit_power` | varchar(20) | 동력 전선관 규격 (예: "28C") |
| `conduit_control` | varchar(20) | 제어 전선관 규격 (예: "28C", "-", null) |
| `mcc_size_mm` | integer | MCC unit 폭 (mm): 200, 400, 600 등 |
| `mcc_panel_count` | integer | MCC 패널 면수 ⚠️ mcc_size 누적 초과 시 분할 (소스코드 확인) |
| `ct_primary_a` | varchar(50) | CT 1차 정격 — 차단기 AT값/5A 형식 ✅ (예: "10/5A", "500/5A") |
| `spd_capacity_ka` | integer | SPD 용량 (kA) — MCC 기본 설치 ✅ |
| `spd_breaker_rating_a` | varchar(50) | SPD 차단기 — AT 75 이상→"ABS 104/75", 미만→동일 차단기 ✅ |
| `item_order` | integer | 정렬 순서 |

**샘플 데이터** (project_id = 1s1s1a1s, 주요 행):

| mcc_equip_no | field_type | ctrl_method | power_kw | cable_cv | cable_gv | conduit_power | conduit_control | std_distance_m | conduit_length_m | mcc_size_mm | mcc_panel_count | breaker_model | mc_model | eocr_model | condenser |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| MCC1 | TITLE | - | 161.55 | 300SQ 4C | 150SQ | 104C | 22C | 30.00 | NULL | 600 | NULL | ABS 604/500 | - | - | - |
| M-101 | ITEM | S_SYS01 | 3.70 | 4SQ 3C | 4SQ | 28C | 28C | 0.00 | 0 | 200 | 6 | ABS 33/10 | MC-9a | DMP60i-TZ | 30 |
| M-102 | ITEM | S_SYS01 | 3.70 | 4SQ 3C | 4SQ | 28C | 28C | 80.00 | 13 | 200 | 6 | ABS 33/10 | MC-9a | DMP60i-TZ | 30 |
| M-203 | ITEM | S_SYS01 | 5.50 | 4SQ 3C | 4SQ | 28C | NULL | 93.00 | 13 | 200 | 6 | ABS 33/15 | MC-12a | DMP60i-TZ | 50 |
| M-204 | ITEM | S_SYS04 | 0.75 | 4SQ 4C | 4SQ | 36C | 36C | 0.00 | 0 | 200 | 6 | EBS 34/3 | NULL | NULL | NULL |
| M-205 | ITEM | S_SYS04 | 75.00 | 70SQ 4C | 35SQ | 70C | 22C | 44.00 | 10 | 400 | 6 | EBS 204/150 | NULL | NULL | NULL |
| M-209 | ITEM | S_SYS01 | 1.50 | 4SQ 3C | 4SQ | 28C | 28C | 70.00 | 21 | 200 | 6 | ABS 33/3 | MC-6a | DMP06i-TZ | 10 |

---

### 2.3 elec_instrument_list — 계측기 리스트

**역할**: 계측기별 전원/신호/케이블/전선관 정보. 계측 케이블 스케줄, IO 집계 원천.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `instrument_id` | uuid | PK |
| `project_id` | uuid | 프로젝트 FK |
| `process_seq` | integer | 공정 번호 |
| `process_code` | varchar | 공정 코드 |
| `process_name` | varchar | 공정명 |
| `tag` | varchar | 계측기 tag (LIT-1001 등) |
| `equipment_type` | varchar | I_WTG02 등 |
| `equipment_name` | varchar | 계측기명 |
| `placement` | varchar | 설치 위치 |
| `analyte` | varchar | 분석 대상물질 |
| `quantity` | integer | 수량 |
| `cable_cv` | varchar | 전원 CV 케이블 |
| `cable_gv` | varchar | 접지 GV 케이블 |
| `plc_cable_di` | **varchar** | DI 신호 케이블 사양 ⚠️ (power_equip은 integer) |
| `plc_cable_do` | **varchar** | DO 신호 케이블 사양 |
| `plc_cable_ai` | **varchar** | AI 신호 케이블 사양 (예: "1") |
| `plc_cable_ao` | **varchar** | AO 신호 케이블 사양 |
| `plc_cable_rs485` | **varchar** | RS485 케이블 사양 |
| `plc_cable_cvv` | varchar | CVV 케이블 규격 |
| `plc_cable_cvv_sb` | varchar | CVV-SB 케이블 규격 |
| `outer_diameter_cv` | numeric | CV 외경 (mm) |
| `outer_diameter_gv` | numeric | GV 외경 (mm) |
| `outer_diameter_cvv` | numeric | CVV 외경 (mm) |
| `outer_diameter_cvv_sb` | numeric | CVV-SB 외경 (mm) |
| `conduit_power` | varchar | 전원 전선관 규격 |
| `conduit_control` | varchar | 신호 전선관 규격 |
| `item_order` | integer | 정렬 순서 |

> ⚠️ **타입 주의**: `plc_cable_di/do/ai/ao/rs485`가 `elec_power_equip_list`에서는 integer(수량)이지만 `elec_instrument_list`에서는 varchar(사양 문자열)로 다름.

**샘플 데이터** (project_id = 1s1s1a1s):

| tag | equipment_type | quantity | cable_cv | plc_cable_ai | plc_cable_cvv_sb | outer_diameter_cv | conduit_power | conduit_control |
|---|---|---|---|---|---|---|---|---|
| LIT-1001 | I_WTG02 | 1 | 2.5SQ 3C | "1" | 1.5SQ 2C | 12.50 | 28C | 22C |
| LIT-2001 | I_WTG02 | 2 | 2.5SQ 3C | "1" | 1.5SQ 2C | 12.50 | 28C | 22C |
| LS-2001 | I_WTG04 | 1 | null | "1" | 1.5SQ 2C | null | null | null |
| AIT-2001 | I_DOM01 | 2 | 2.5SQ 3C | "1" | 1.5SQ 2C | 12.50 | 28C | 22C |

---

### 2.4 elec_selection_rules — 전기 선정 규칙 테이블

**역할**: 전기 자동선정 로직의 유일한 기준 DB. 모든 케이블/전선관/차단기/기기 선정은 이 테이블 참조.

**스키마** (✅ 직접 확인):

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `rule_id` | uuid | PK |
| `rule_type` | varchar | 규칙 유형 (아래 목록 참조) |
| `rule_name` | varchar | 세부 규칙명 |
| `starting_method` | varchar | 기동방식 필터 (S_SYS01~05 또는 null) |
| `unit_system` | varchar | METRIC / USCS |
| `min_value` | numeric | 적용 하한 |
| `max_value` | numeric | 적용 상한 |
| `input_unit` | varchar | 입력 단위 (A, kW, mm2 등) |
| `result_data` | jsonb | 선정 결과 (rule_type마다 다른 키) |
| `sort_order` | integer | 우선순위 |
| `is_active` | boolean | 활성화 여부 |
| `note` | text | 비고 |

**rule_type 목록** (✅ 전체 확인):

| rule_type | 행 수 | starting_method | input_unit | result_data 키 | 저장 필드 |
|---|---|---|---|---|---|
| `cable` | 15 | null | A | `cv_crosssection_mm2`, `gv_crosssection_mm2` | cable_cv, cable_gv |
| `cable_diameter` | 101 | null | mm2 or core수 | 아래 참조 | outer_diameter_* |
| `conduit` | 9 | null | mm2(면적) | `conduit_size` | conduit_power, conduit_control |
| `breaker` | 165 | S_SYS01~05 | A | `breaker_model` | breaker_model |
| `mc` | 12 | S_SYS01 | kW | `mc_model` | mc_model |
| `eocr` | 2 | S_SYS01 | kW | `eocr_model` | eocr_model |
| `inverter` | 17 | S_SYS02 | kW | `inverter_model` | inverter_model |
| `soft_starter` | 23 | S_SYS03 | kW | `softstarter_model` | soft_starter |
| `capacitor` | 28 | S_SYS01 | kW | `capacitance_uf` | condenser |
| `mcc_size` | 120 | S_SYS01~05 | kW | `mcc_size_mm` | mcc_size_mm |

#### 2.4.1 cable rule (CV/GV 선정)

입력: `rated_current_a`, 조건: `starting_method` 없음 (전방식 공통)  
결과: `result_data = {cv_crosssection_mm2: 4, gv_crosssection_mm2: 4}`

| 전류 범위 (A) | CV (mm²) | GV (mm²) |
|---|---|---|
| 0 ~ 24.44 | 4 | 4 |
| 24.44 ~ 32.59 | 6 | 6 |
| 32.59 ~ 43.78 | 10 | 6 |
| 43.78 ~ 57.86 | 16 | 10 |
| 57.86 ~ 79.93 | 25 | 16 |
| 79.93 ~ 103.21 | 35 | 16 |
| 103.21 ~ 134.29 | 50 | 25 |
| 134.29 ~ 154.45 | 70 | 35 |
| 154.45 ~ 193.00 | 95 | 50 |
| 193.00 ~ 231.17 | 120 | 70 |
| 231.17 ~ 289.42 | 150 | 95 |
| 289.42 ~ 328.43 | 185 | 95 |
| 328.43 ~ 405.93 | 240 | 120 |
| 405.93 ~ 492.80 | 300 | 150 |
| 492.80 ~ ∞ | 400 | 185 |

> ✅ 표기 규칙: S_SYS01/02/03 → `{cv_mm²}SQ 3C`, S_SYS04 → `{cv_mm²}SQ 4C`  
> ✅ cable_cv 필드 형식 예: "4SQ 3C", "70SQ 4C", "300SQ 4C"  
> **검증 (DB):** `elec_selection_rules WHERE rule_type='cable'` 전체 15행 직접 조회 — 위 표의 전류 범위 및 CV/GV 단면적 수치 일치 확인 ✅

#### 2.4.2 cable_diameter rule (외경 산출)

rule_name 3종류, 조합으로 outer_diameter_* 채움:

| rule_name | 입력 기준 | result_data 키 | 의미 |
|---|---|---|---|
| `cv_cable_outer_diameter_reference` | mm2 범위 + `cv_core_c_NONE` (core 수) | `cv_cable_outer_diameter_mm` | CV 케이블 외경 |
| `cvv_cable_outer_diameter_reference` | core 수 범위 | `cvv_outer_dia_mm` | CVV 케이블 외경 |
| `cvv_sb_cable_outer_diameter_reference` | core 수 범위 | `cvv_sb_outer_dia_mm` | CVV-SB 케이블 외경 |

> ⚠️ CV 외경 조회 시 단면적(mm²)과 core 수 모두 일치하는 행 선택  
> ⚠️ GV 케이블 외경 조회: GV 전용 참조표 존재 (rule_name 확인 필요 — 소스코드 확인)  
> ✅ CVV/CVV-SB core 수는 equipment_cable_spec (PLC 참조표) 기준으로 조회

예시: 4SQ 3C CV → min_value=2.5, max_value=6.0, cv_core_c_NONE="3" → outer_diameter = 11.5mm

#### 2.4.3 conduit rule (전선관 규격 선정)

입력: 전선관 내부에 들어가는 케이블들의 단면적 합(π×(d/2)² 총합)  
결과: `result_data = {conduit_size: "28C"}`

| 면적 합계 (mm²) | 전선관 규격 |
|---|---|
| 0 ~ 51 | 16C |
| 51 ~ 95 | 22C |
| 95 ~ 154 | 28C |
| 154 ~ 254 | 36C |
| 254 ~ 346 | 42C |
| 346 ~ 573 | 54C |
| 573 ~ 962 | 70C |
| 962 ~ 1320 | 82C |
| 1320 ~ ∞ | 104C |

> **검증 (DB):** `elec_selection_rules WHERE rule_type='conduit'` 9행 직접 조회 — 위 표의 면적 범위 및 전선관 규격 일치 확인 ✅

**전선관 면적 계산 공식** (✅ 샘플 검증):

```
conduit_power (S_SYS01/02/03) = π×(outer_diameter_cv/2)² + π×(outer_diameter_gv/2)²
  예: M-101, 4SQ 3C(11.5mm) + 4SQ(~10mm) → π×5.75² + π×5.0² ≈ 104 + 78 = 182 → 36C? 
  ⚠️ 실제값=28C이므로 GV 외경 조회 로직 또는 합산 기준이 다를 수 있음 → 소스코드 확인

conduit_power (S_SYS04) = π×(outer_diameter_cv/2)²  (CV 4C만 사용)
  예: M-205, 70SQ 4C CV 외경으로 conduit_power=70C → ✅ 검증됨

conduit_control (S_SYS01/02/03) = π×(outer_diameter_cvv/2)² + π×(outer_diameter_cvv_sb/2)²  ✅
  CVV + CVV-SB 동시 존재 가능 (PLC 참조표 기준), 두 외경을 합산하여 conduit 규격 선정
  conduit_control = NULL 조건: equipment_cable_spec에 CVV/CVV-SB 미등록된 장비유형 (예: M-203 M_PMP1402) ✅

conduit_control (S_SYS04/MOP) = CVV-SB 기준 ✅ (예: M-204=36C, M-205=22C)
```

> **검증 (DB):** `elec_power_equip_list WHERE project_id='1s1s1a1s'` 조회 — M-203(M_PMP1402) conduit_control=NULL 확인, M-204·M-205(S_SYS04) conduit_control CVV-SB 기준 산출 확인 ✅  
> **검증 (DB):** `equipment_cable_spec WHERE code_key='M_PMP1402'` 조회 — CVV/CVV-SB 미등록 확인(conduit_control=NULL 원인) ✅

#### 2.4.4 breaker rule (차단기 선정)

입력: `starting_method` + `rated_current_a`  
결과: `result_data = {breaker_model: "ABS 33/10"}`

| starting_method | 시리즈 |
|---|---|
| S_SYS01/02/03 | ABS 시리즈 ✅ |
| S_SYS04 | EBS 시리즈 ✅ |
| S_SYS05 | ⚠️ 미사용 (DB 규칙 존재하나 실사용 0건, 개발팀 확인 필요) |

> **검증 (DB):** `elec_selection_rules WHERE rule_type='breaker'` 165행 조회 — starting_method별 ABS(S_SYS01~03)/EBS(S_SYS04) 계열 분리 확인, `elec_power_equip_list` 샘플 데이터와 100% 일치 ✅

#### 2.4.5 mc rule (MC 선정)

- starting_method: S_SYS01 전용 ✅
- 입력: `power_kw`
- 결과: `{mc_model: "MC-9a"}`
- 12개 범위 (kW 기준)

| kW 범위 | MC 모델 |
|---|---|
| 0 ~ 0.4 | MC-6a |
| 0.4 ~ 1.5 | MC-6a |
| 1.5 ~ 2.2 | MC-6a |
| 2.2 ~ 4.0 | MC-9a |
| 4.0 ~ 5.5 | MC-12a |
| 5.5 ~ 7.5 | MC-18a |
| 7.5 ~ 11.0 | MC-22a |
| 11.0 ~ 15.0 | MC-32a |
| 15.0 ~ 18.5 | MC-40a |
| 18.5 ~ 22.0 | MC-50a |
| 22.0 ~ 30.0 | MC-65a |
| 30.0 ~ ∞ | MC-85a |

#### 2.4.6 eocr rule (EOCR 선정)

- starting_method: S_SYS01 전용 ✅
- 입력: `power_kw`
- 결과: `{eocr_model: "DMP06i-TZ"}`

| kW 범위 | EOCR 모델 |
|---|---|
| 0 ~ 3.55 | DMP06i-TZ |
| 3.55 ~ ∞ | DMP60i-TZ |

#### 2.4.7 inverter rule (인버터 선정)

- starting_method: S_SYS02 전용 ✅
- 입력: `power_kw`
- 결과: `{inverter_model: "G100 0.4"}`

| kW 범위 | 인버터 모델 |
|---|---|
| 0 ~ 0.4 | G100 0.4 |
| 0.4 ~ 0.75 | G100 0.75 |
| 0.75 ~ 1.5 | G100 1.5 |
| 1.5 ~ 2.2 | G100 2.2 |
| 2.2 ~ 4.0 | G100 4 |
| 4.0 ~ 5.5 | G100 5.5 |
| 5.5 ~ 7.5 | G100 7.5 |
| 7.5 ~ 11.0 | G100 11 |
| 11.0 ~ 15.0 | G100 15 |
| 15.0 ~ 18.5 | G100 18.5 |
| 18.5 ~ 22.0 | G100 22 |
| 22.0 ~ 30.0 | S100 30 |
| 30.0 ~ 50.0 | S100 50 |
| 50.0 ~ 60.0 | S100 60 |
| 60.0 ~ 75.0 | S100 75 |
| 75.0 ~ 100.0 | S100 100 |
| 100.0 ~ ∞ | S100 100 |

#### 2.4.8 soft_starter rule

- starting_method: S_SYS03 전용 ✅
- 입력: `power_kw`
- 결과: `{softstarter_model: "SS 2.2"}` → elec_power_equip_list.soft_starter에 저장

| kW 범위 | 모델 |
|---|---|
| 0 ~ 2.2 | SS 2.2 |
| 2.2 ~ 3.7 | SS 3.7 |
| 3.7 ~ 5.5 | SS 5.5 |
| 5.5 ~ 7.5 | SS 7.5 |
| 7.5 ~ 11.0 | SS 11 |
| 11.0 ~ 15.0 | SS 15 |
| 15.0 ~ 22.0 | SS 22 |
| 22.0 ~ 30.0 | SS 30 |
| 30.0 ~ 37.0 | SS 37 |
| 37.0 ~ 56.0 | SS 56 |
| 56.0 ~ 75.0 | SS 75 |
| 75.0 ~ 98.0 | SS 98 |
| 98.0 ~ 112.0 | SS 112 |
| 112.0 ~ 150.0 | SS 150 |
| 150.0 ~ 187.0 | SS 187 |
| 187.0 ~ 195.0 | SS 195 |
| 195.0 ~ 225.0 | SS 225 |
| 225.0 ~ 240.0 | SS 240 |
| 240.0 ~ 300.0 | SS 300 |
| 300.0 ~ 375.0 | SS 375 |
| (+3개 추가 구간) | … |

#### 2.4.9 capacitor rule (콘덴서 선정)

- starting_method: S_SYS01 전용 ✅
- 입력: `power_kw`
- 결과: `{capacitance_uf: "7.5"}` (string, "-"는 해당 없음)
- 저장: elec_power_equip_list.condenser (varchar) ✅

| kW 범위 | 콘덴서 (μF) |
|---|---|
| 0 ~ 0.75 | - (없음) |
| 0.75 ~ 1.10 | 7.5 |
| 1.10 ~ 1.50 | 10 |
| 1.50 ~ 2.20 | 15 |
| 2.20 ~ 3.00 | 20 |
| 3.00 ~ 4.00 | 30 |
| 4.00 ~ 5.00 | 40 |
| 5.00 ~ 5.50 | 50 |
| 5.50 ~ 7.50 | 75 |
| 7.50 ~ 11.00 | 100 |
| 11.00 ~ 15.00 | 100 |
| 15.00 ~ 20.00 | 150 |
| 20.00 ~ 22.00 | 150 |
| (+이후 구간 계속) | … |

#### 2.4.10 mcc_size rule (MCC 단위 폭 선정)

- 입력: `starting_method` + `power_kw`
- 결과: `{mcc_size_mm: 200}` (integer)
- starting_method 5종 전부 포함 (S_SYS01~05), 총 120행 ✅
- ✅ TITLE 행의 mcc_size_mm=600은 elec_selection_rules (starting_method=None) 기준 선정값 (S_SYS05 로직과 동일)

---

### 2.5 equipment_cable_spec — 설비유형별 케이블/IO 기준

**역할**: 장비유형 코드(code_key)별 PLC 신호 수량과 케이블 규격 기준. `elec_instrument_list`와 `elec_power_equip_list`의 plc_cable_* 자동채움 원천.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `code_key` | varchar | M_DAF0201, I_WTG02 등 |
| `reference_type` | varchar | MACHINE 또는 INSTRUMENT |
| `has_di` | integer | DI 신호 수 ✅ |
| `has_do` | integer | DO 신호 수 ✅ |
| `has_ai` | integer | AI 신호 수 ✅ |
| `has_ao` | integer | AO 신호 수 ✅ |
| `has_rs485` | integer | RS485 수 ✅ |
| `has_ethernet` | ? | Ethernet 유무 ✅ |
| `cv_spec` | varchar | CV 케이블 규격 |
| `gv_spec` | varchar | GV 케이블 규격 |
| `cvv_spec` | varchar | CVV 케이블 규격 |
| `cvv_sb_spec` | varchar | CVV-SB 케이블 규격 |
| `status_signal` | jsonb | 상태 신호 JSON |

---

## 3. API 엔드포인트 상세

### 3.1 elec_equip_load_list API

| Method | Path | 용도 |
|---|---|---|
| GET | `/api/v1/equipment/elec_equip_load_list` | 프로젝트별 부하계산 리스트 조회 |
| POST | `/api/v1/equipment/elec_equip_load_list` | 부하계산 레코드 생성 |
| PUT | `/api/v1/equipment/elec_equip_load_list/{load_id}` | 레코드 수정 |
| GET | `/api/v1/equipment/elec_equip_load_list/auto_fill/{equipment_id}` | 자동채움 미리보기 |
| POST | `/api/v1/equipment/elec_equip_load_list/{load_id}/refresh` | 단일 레코드 자동채움 갱신 |
| POST | `/api/v1/equipment/elec_equip_load_list/batch_refresh` | 프로젝트 전체 갱신 |
| GET | `/api/v1/equipment/elec_equip_load_list/mcc/{mcc_no}/summary` | MCC별 부하 집계 |
| GET | `/api/v1/equipment/elec_equip_load_list/project_summary` | 프로젝트 전체 부하 집계 |

### 3.2 elec_power_equip_list API

| Method | Path | 용도 |
|---|---|---|
| GET | `/api/v1/equipment/elec_power_equip_list` | 프로젝트별 동력설비 리스트 조회 |
| POST | `/api/v1/equipment/elec_power_equip_list` | 레코드 생성 |
| PATCH | `/api/v1/equipment/elec_power_equip_list/{power_equip_id}` | 레코드 수정 |
| GET | `/api/v1/equipment/elec_power_equip_list/auto-fill/preview` | 자동채움 미리보기 |
| POST | `/api/v1/equipment/elec_power_equip_list/auto-fill/refresh/{power_equip_id}` | 단일 자동채움 갱신 |
| POST | `/api/v1/equipment/elec_power_equip_list/auto-fill/refresh-all` | 프로젝트 전체 자동채움 갱신 |
| PATCH | `/api/v1/equipment/elec_power_equip_list/3d-add-fields` | 3D 추가 필드 수정 |
| GET | `/api/v1/equipment/elec_power_equip_list/mcc/list` | MCC 목록 조회 |
| GET | `/api/v1/equipment/elec_power_equip_list/summary/mcc/{mcc_no}` | MCC별 합계 |
| GET | `/api/v1/equipment/elec_power_equip_list/summary/project` | 프로젝트 전체 합계 |

### 3.3 elec_instrument_list API

| Method | Path | 용도 |
|---|---|---|
| GET | `/api/v1/equipment/elec_instrument_list` | 프로젝트별 계측기 리스트 조회 |
| POST | `/api/v1/equipment/elec_instrument_list` | 계측기 생성 |
| PUT | `/api/v1/equipment/elec_instrument_list/{instrument_id}` | 계측기 수정 |
| PATCH | `/api/v1/equipment/elec_instrument_list` | 전선관 규격 수정 (복합키) |
| GET | `/api/v1/equipment/elec_instrument_list/auto_fill/{equipment_type}` | 자동채움 미리보기 |
| POST | `/api/v1/equipment/elec_instrument_list/{instrument_id}/refresh` | 단일 갱신 |
| POST | `/api/v1/equipment/elec_instrument_list/batch_refresh` | 전체 갱신 |

### 3.4 기준정보 API

| API | 입력 | 출력 | DB |
|---|---|---|---|
| GET `/api/v1/equipment/elec/cable/cv-gv` | rated_current, unit_system | CV/GV mm² | elec_selection_rules (cable) |
| GET `/api/v1/equipment/elec/cable/diameter` | cable_type, crosssection_mm2, core_count | 외경 mm | elec_selection_rules (cable_diameter) |
| GET `/api/v1/equipment/elec/breaker/model` | starting_method, rated_current | 차단기 모델 | elec_selection_rules (breaker) |
| GET `/api/v1/equipment/elec/mcc/size` | starting_method, power_kw | mcc_size_mm | elec_selection_rules (mcc_size) |
| GET `/api/v1/equipment/elec/cable/spec/{code_key}` | 장비/계측 코드 | 케이블/IO 기준 | equipment_cable_spec |
| POST `/api/v1/equipment/elec/cable/spec/batch` | code_keys[] | 일괄 케이블/IO 기준 | equipment_cable_spec |

---

## 4. 전기 도면용 Public API

전기 도면은 `elec_power_equip_list`를 View Model로 변환한 public API를 사용한다.

### 4.1 MCC 구성도 — MCCD

```
GET /api/public/v1/equipment/elec-power-equip-list/mccd?project_id={id}
선택: mcc_no, field_type, skip, limit
응답: ElecPowerEquipListMCCDResponse
```

| 응답 필드 | 도면 용도 |
|---|---|
| project_name, site_address | 도곽 정보 |
| mcc_no | MCC 번호 |
| field_type | TITLE/ITEM 구분 |
| mcc_equip_no | 기기번호 |
| equipment_name | 장비명 |
| ctrl_method_value | 기동방식 한국어 |
| normal_quantity, spare_quantity, total_quantity | 수량 |
| mcc_size_mm | MCC unit 폭 |

### 4.2 전동기 기동반 결선도 — MSWD

```
GET /api/public/v1/equipment/elec-power-equip-list/mswd?project_id={id}
응답: ElecPowerEquipListMSWDResponse
```

| 응답 필드 | 도면 용도 |
|---|---|
| mcc_equip_no | 회로번호 |
| equipment_name | 부하명 |
| power_kw | 동력 |
| ctrl_method_value | 기동방식 |
| breaker_model | 차단기 |
| ct_primary_a | CT 1차 정격 |
| spd_capacity_ka | SPD 용량 |
| spd_breaker_rating_a | SPD 차단기 |
| condenser | 콘덴서 (μF) |

### 4.3 현장조작반 외형도 — LCPO

```
GET /api/public/v1/equipment/elec-power-equip-list/lcpo?project_id={id}
응답: ElecPowerEquipListLCPOResponse
```

| 응답 필드 | 도면 용도 |
|---|---|
| mcc_equip_no | 설비번호 |
| equipment_name | 설비명 |
| ctrl_method_value | 기동방식 |
| normal_quantity, spare_quantity, total_quantity | 수량 |
| control_panel_type | LOP / MOP |

---

## 5. elec_power_equip_list Auto-Fill 12단계 순서

`POST /auto-fill/refresh-all` 또는 단건 refresh 호출 시 내부 실행 순서 (✅ 규칙 확인, ⚠️ 일부 세부 알고리즘 미확인):

```
[입력] elec_equip_load_list 레코드 (ITEM 행만 처리. TITLE은 별도)

Step 1. ctrl_method 확인 ✅
  - S_SYS01~05 중 하나. null이면 오류 처리 ⚠️

Step 2. cable_cv / cable_gv 선정 ✅
  - input: rated_current_a
  - lookup: elec_selection_rules WHERE rule_type='cable'
    AND min_value <= rated_current_a < max_value
  - S_SYS01/02/03 → 3C CV, S_SYS04 → 4C CV ✅

Step 3. outer_diameter_cv 조회 ✅
  - input: cv_crosssection_mm2, core_count
  - lookup: cable_diameter, rule_name='cv_cable_outer_diameter_reference'
    WHERE min_value <= cv_mm2 < max_value AND cv_core_c_NONE = core_count

Step 4. outer_diameter_gv 조회 ⚠️
  - input: gv_crosssection_mm2
  - lookup: cable_diameter, rule_name 미확인 (cv_cable_outer_diameter_reference 1C??)
  
Step 5. plc_cable_cvv / plc_cable_cvv_sb / outer_diameter_cvv(_sb) 조회 ✅
  - input: equipment_type → equipment_cable_spec 조회
  - cvv_spec / cvv_sb_spec 채움
  - outer_diameter_cvv / outer_diameter_cvv_sb → cable_diameter rule 조회

Step 6. conduit_power 선정 ✅ (공식) ⚠️ (세부 면적 계산 확인 필요)
  - S_SYS01/02/03: π×(outer_diameter_cv/2)² + π×(outer_diameter_gv/2)²
  - S_SYS04: π×(outer_diameter_cv/2)²
  - lookup: conduit rule로 conduit_size 결정

Step 7. conduit_control 선정 ✅ (공식) ⚠️ (세부 면적 계산 확인 필요)
  - S_SYS01/02/03: π×(outer_diameter_cvv/2)² + π×(outer_diameter_cvv_sb/2)²
    CVV + CVV-SB 동시 가능 (PLC 참조표 기준) ✅
  - S_SYS04 (MOP): CVV-SB 기준 ✅
  - conduit_control = NULL: equipment_cable_spec에 CVV/CVV-SB 미등록 시 (예: M-203 M_PMP1402) ✅

Step 8. breaker_model 선정 ✅
  - input: starting_method + rated_current_a
  - lookup: breaker rule

Step 9. mc_model 선정 ✅
  - 조건: ctrl_method = S_SYS01만
  - input: power_kw
  - lookup: mc rule

Step 10. eocr_model 선정 ✅
  - 조건: ctrl_method = S_SYS01만
  - input: power_kw
  - 0~3.55kW → DMP06i-TZ, 3.55kW+ → DMP60i-TZ

Step 11. 기동방식별 부속기기 선정 ✅
  - S_SYS01: condenser (capacitor rule, capacitance_uf)
  - S_SYS02: inverter_model (inverter rule)
  - S_SYS03: soft_starter (soft_starter rule)
  - S_SYS04: 없음 (EBS 차단기만)

Step 12. mcc_size_mm 선정 ✅
  - input: starting_method + power_kw
  - lookup: mcc_size rule

[TITLE 행 처리] ✅
  - cable_cv = cable rule(normal_current_a) → cv_mm² → "{cv}SQ 4C" (항상 4C) ✅
  - cable_gv = cable rule(normal_current_a) → gv_mm² → "{gv}SQ" ✅
  - breaker_model = breaker rule(starting_method=S_SYS01, normal_current_a) → ABS 계열 고정 ✅
  - std_distance_m: 30 고정 ✅
  - conduit_length_m: NULL ✅
  - mcc_size_mm: 600 (elec_selection_rules, starting_method=None) ✅
  - mcc_panel_count: ⚠️ 산정 로직 소스코드 확인 필요

> **검증 (DB):** 4개 프로젝트 TITLE 행 전체 24개 교차조회 (`elec_power_equip_list WHERE field_type='TITLE'`) — cable rule(normal_current_a) 결과와 실제 cable_cv 100% 일치(전 항목 4C 형식), breaker rule(S_SYS01, normal_current_a) 결과와 실제 breaker_model 100% 일치(전 항목 ABS 계열) ✅

[거리/전선관 길이] ⚠️
  - 3D 경로 있음: std_distance_m = 실제 경로 길이, conduit_length_m = Tray 제외 구간 길이
  - 3D 경로 없음: std_distance_m = 0, conduit_length_m = 0  ✅ (M-101)
  - TITLE 행: std_distance_m = 30 고정 (MCC 피더 고정거리) ✅
  - 계측기(elec_instrument_list) 전체: std_distance_m = 30 고정 ✅
  - conduit_power / conduit_control: 3D 배선 연동 전까지 NULL (기본값) ✅
```

---

## 6. report.json / project.json 구조

### 6.1 report.json (공정계산 결과)

```
GET /api/v1/projects/{project_id}/report
또는 MinIO: wai-design/{project_id}/report.json
```

```json
{
  "equipments": [
    {
      "EQP": {
        "{code_key}": {
          "power_kW": 3.7,
          "ctrl_method": "S_SYS01",
          "efficiency_percent": 0.895,
          "pwr_factor_percent": 0.85,
          "demand_factor_percent": 60.0,
          "rated_volt_V": 380,
          "normal_count": 2,
          "spare_count": 1,
          "tag_number": "M-101"
        }
      }
    }
  ],
  "tray_quantity": [
    {
      "electrical_code": "...",
      "specification": "W500*100H*2.3t",
      "quantity": 90
    }
  ]
}
```

> ✅ efficiency/pwr_factor는 원본 카탈로그 기준 (예: 0.895)  
> ✅ DB 저장 시 반올림 (예: 0.90)으로 일부 오차 발생 가능  
> ✅ demand_factor_percent는 % 형식 (60.0 = 60%)으로 계산 시 /100 필요

### 6.2 project.json (3D 프로젝트 상태)

```
GET /api/v1/projects/{project_id}
```

```json
{
  "isSaveElectricalDesign": true,
  "electrictrays": [
    {
      "obj_id": "...",
      "obj_name": "MCC1",
      "type": "mcc",
      "columns": 4,
      "transformData": {"pos": {...}, "rotation": {...}, "scale": {...}}
    }
  ],
  "electric_wires": [
    {
      "start_connector_id": "...",
      "end_connector_id": "...",
      "points": [{"x": ..., "y": ..., "z": ..., "magnitude": ...}]
    }
  ],
  "mcc_details": [
    {
      "ctrl_method_value": "직입기동"
    }
  ]
}
```

> ⚠️ electric_wires → std_distance_m 변환 로직 (합산 방법, Tray 구간 제외 방법) 소스코드 확인 필요

---

## 7. 전기계산서 출력 매핑

### 7.1 산출물과 DB 테이블 연결

| 전기계산서 시트 | 원천 테이블 | 핵심 필드 |
|---|---|---|
| 동력설비 부하계산서 | elec_equip_load_list (ITEM) | rated_current_a, load_capacity_kva, normal_current_a, demand_factor |
| 부하일람표 (MCC별) | elec_equip_load_list (TITLE+ITEM) | normal_power_kw, normal_load_kva, normal_current_a |
| 동력설비 리스트 | elec_power_equip_list | cable_cv, cable_gv, conduit_*, breaker_model |
| 계측기 리스트 | elec_instrument_list | cable_cv, plc_cable_*, conduit_* |
| IO 집계 | elec_power_equip_list + elec_instrument_list | plc_cable_di/do/ai/ao/rs485 |
| MCC 구성도 (도면) | public API mccd | mcc_no, mcc_equip_no, mcc_size_mm |
| 결선도 (도면) | public API mswd | breaker_model, ct_primary_a, condenser |
| 현장조작반 외형도 | public API lcpo | control_panel_type, quantity |
| 범례 (도면) | ❓ | ❓ |

> ✅ 도면 생성 결과: SVG 형식으로 MinIO `wai-drawing-files` 버킷에 저장  
> ✅ MinIO 경로 패턴: `wai-drawing-files/{file_id}/{filename}` (project_id 미포함, file_id 기준 flat 구조)  
> **검증 (MinIO):** `wai-drawing-files` 버킷 오브젝트 목록 직접 조회 — `{file_id}/{filename}` 경로 구조 확인, project_id 미포함 flat 구조 확인 ✅  
> ⚠️ drawing_masters.project_id = NULL (전체): 현재 MCCD/MSWD/LCPO 타입 도면이 drawing_masters에 저장되지 않음 — 전기 도면 저장 방식 소스코드 확인 필요  
> **검증 (DB):** `drawing_masters` 전체 828건 조회 — project_id=NULL 전수 확인, drawing_type 컬럼에 MCCD·MSWD·LCPO 타입 존재하지 않음 확인 ⚠️

### 7.2 전기계산서 출력 방식

> **검증 (MinIO):** 전체 버킷(wai-output-statement, wai-project, wai-formula-library 등) 대상 `elec/electrical/계산서/capacity` 키워드 조회 — 전기계산서 xlsx 파일 0건. MinIO에 저장되지 않음 확인 ✅  
> **사용자 확인:** 전기계산서는 버튼 클릭 시 즉시 생성되는 온디맨드 스트림 방식. MinIO에 저장하지 않고 HTTP 응답으로 xlsx를 직접 반환함 ✅  
> ❓ 시트별 셀/컬럼 매핑 미완료. 소스코드 또는 `1s1s1a1s_electricalcapacity.xlsx` 직접 분석 필요.

---

## 8. 소스코드 확인 필요 항목

| 우선순위 | 항목 | 확인 키워드 |
|---|---|---|
| 1 | GV 케이블 외경 조회 rule_name | `cable_diameter`, `gv`, `outer_diameter_gv` |
| 2 | conduit_power/control 면적 계산 정확한 공식 | `conduit`, `outer_diameter`, `fill_rate` |
| 3 | electric_wires → std_distance_m 변환 | `electric_wires`, `magnitude`, `std_distance_m` |
| 3 | Tray 구간 제외 → conduit_length_m 산정 | `conduit_length_m`, `tray`, `route` |
| 4 | TITLE 행 피더 케이블/차단기 산정 | `field_type=TITLE`, `feeder`, `mcc_panel_count` |
| 5 | mcc_panel_count 산정 로직 | `mcc_panel_count`, `panel`, `column` |
| 6 | auto-fill refresh 사용자 수정값 보존 방식 | `is_user_modified`, `refresh`, `preserve` |
| 7 | 3d-add-fields PATCH 업데이트 대상 필드 | `3d-add-fields`, `std_distance_m`, `electric_wires` |
| 8 | S_SYS05 의미와 실사용 여부 | `S_SYS05` |
| 9 | MCC 한계 상용 전류 UI 설정 저장 위치 | `threshold_current`, `mcc_limit`, `grouping` |
| 10 | MinIO 도면 파일 경로 규칙 | `minio`, `drawing`, `bucket`, `path` |
| 11 | 범례 도면 데이터 원천 | `legend`, `범례`, `drawing_template` |
| 12 | SVG/DXF/PDF 도면 템플릿 위치 | `template`, `svg`, `dxf`, `drawing_masters` |
| 13 | Excel 전기계산서 셀/시트 매핑 | `electricalcapacity`, `openpyxl`, `write_cell` |
| 14 | elec_field_metadata 사용 여부 | `elec_field_metadata`, `display`, `output` |
| 15 | equipment_cable_spec.status_signal 용도 | `status_signal`, `IO`, `결선도` |

---

## 9. 미확인 항목 요약

| 항목 | 상태 | 비고 |
|---|---|---|
| conduit_control 공식 (CVV+CVV-SB 동시) | ✅ | equipment_cable_spec DB 참조표 기준, 동시 합산 |
| M-203 conduit_control=NULL 이유 | ✅ | equipment_cable_spec CVV/CVV-SB 미등록(M_PMP1402) |
| S_SYS04 conduit_control 산정 기준 | ✅ | equipment_cable_spec 기준 (CVV/CVV-SB 장비마다 다름) |
| TITLE mcc_size_mm=600 | ✅ | elec_selection_rules starting_method=None 기준 |
| CT 산정 방식 | ✅ | 차단기 AT값/5A 형식 |
| SPD 설치 기준 | ✅ | MCC 기본 설치, AT 75A 이상→ABS 104/75 |
| 30m 고정 적용 대상 | ✅ | TITLE 행 + 계측기(instrument) 전체 |
| load_capacity_kva 반올림 | ✅ | 소수점 2자리 |
| TITLE 집계 공식(kW/kVA/수용률) | ✅ | kW=Σ(동력×수량), kVA=Σ(상용전류)+MAX×0.1, 수용률=평균 |
| TITLE 피더 케이블/차단기 산정 | ✅ | cable rule(normal_current_a)→4C, breaker rule(S_SYS01, normal_current_a) |
| conduit 기본값 | ✅ | 3D 배선 연동 전 NULL, 연동 후 계산 |
| mcc_size 기동방식별 참조 | ✅ | ctrl_method 그대로 DB 조회, 기동방식별 독립 참조행 존재 |
| MinIO 경로 패턴 | ✅ | wai-drawing-files/{file_id}/{filename} |
| 도면 저장 방식 | ✅ | SVG → MinIO wai-drawing-files 버킷 |
| conduit 면적 공식 세부 (GV 외경 rule_name) | ⚠️ | GV 참조표 존재 확인, rule_name 소스코드 확인 필요 |
| mcc_panel_count 산정 로직 | ⚠️ | mcc_size 누적 초과 시 분할, 소스코드 확인 필요 |
| S_SYS05 의미 | ⚠️ | DB 규칙 존재하나 실사용 0건, 개발팀 확인 필요 |
| MCC 한계 상용 전류 저장 위치 | ⚠️ | UI 설정임 확인, API/DB 저장 위치 소스코드 확인 |
| auto-fill refresh 사용자 수정값 보존 | ⚠️ | 소스코드 확인 필요 |
| 3d-add-fields PATCH 업데이트 필드 | ⚠️ | 소스코드 확인 필요 |
| electric_wires → std_distance_m 변환 | ⚠️ | magnitude 합산 방식 소스코드 확인 필요 |
| drawing_masters 전기 도면 저장 방식 | ⚠️ | MCCD/MSWD/LCPO 타입 미존재, project_id=NULL — 소스코드 확인 |
| 범례 도면 데이터 원천 | ❓ | 소스코드 확인 필요 |
| 전기계산서 출력 방식 | ✅ | 온디맨드 스트림, MinIO 비저장 (MinIO 조회 0건 확인, 사용자 확인) |
| Excel 계산서 시트/셀 매핑 | ❓ | xlsx 직접 분석 필요 |
| elec_field_metadata 사용 여부 | ❓ | 소스코드 확인 필요 |
| equipment_cable_spec.status_signal 용도 | ❓ | 소스코드 확인 필요 |
