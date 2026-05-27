# TDD 전기설계 규칙 v0.3

작성일: 2026-05-19 (초안)  
수정일: 2026-05-22 (v0.3 — GWD 프로젝트 실데이터 교차검증 완료, IO 집계 공식 확정)  
작성 목적: WAI Design 전기설계 파트에서 **전기계산서가 산출되는 과정**과 **전기 도면이 산출되는 과정**을 개발자가 구현 가능한 수준으로 정리한다.

> v0.3 변경 (v0.2 대비): GWD 프로젝트 실데이터(electricalcapacity.xlsx) 교차검증 완료 —  
> - GWD 프로젝트(`019e4d2e-dc83-7154-b1fe-f647b35dbcac`) DB/Excel 전항목 일치 확인  
> - IO 집계 공식 확정 (DI=44, DO=12, AI=5 → spare 20% → 카드 5장)  
> - LOP 면수산출 공식 검증 (LOP 12개, MOP 2개)  
> - 전선관 공유 규칙 및 계측기 conduit 거리 미확인 항목 명확화

**참조 프로젝트:**

| 코드 | project_id | 비고 |
|---|---|---|
| `1s1s1a1s` | `019e00d8-aa36-7fd1-b5b8-1b874e2e477b` | 기본 샘플 (단순 구성) |
| GWD | `019e4d2e-dc83-7154-b1fe-f647b35dbcac` | 실제 발주 프로젝트. `내역서 산출을 위한 기초자료_electricalcapacity.xlsx` 교차검증 완료 ✅ |

> **⚠️ 표시 규칙**
> - `✅ 확정` — DB/API/샘플 데이터로 검증 완료
> - `⚠️ 소스코드 확인 필요` — 방향은 알지만 알고리즘 세부 미확정
> - `❓ 미확인` — 정보 자체가 없음

---

## 1. 문서 범위

포함 범위:

- 전기 초기 데이터 구조 (report.json / equipment_catalog 원천)
- 전기 기준정보 참조 구조 (elec_selection_rules, equipment_cable_spec)
- 전기계산서 산출 과정 (부하계산 → 기기선정 → 케이블/전선관 → IO)
- MCC 그룹핑과 전기 도면 데이터 산출
- MCC 구성도(MCCD), 전동기기동반 결선도(MSWD), 현장조작반 외형도(LCPO), 범례 도면

제외 범위:

- 내역서/BOQ 산출: `tdd-내역서/TDD_내역서생성규칙_v0.1.md`
- P&ID 2D 도면 생성: 별도 TDD 예정
- 토목/건축/기계/배관 내역
- 전기실 배치도·케이블트레이 배치도 자체 3D 산출 로직

---

## 2. 전기설계 전체 흐름

```
공정 설계 결과
  → 기계 카탈로그 선택 (equipment_catalog)
  → report.json 생성 (EQP.*.* 키로 설비별 전기 속성 포함)
  → project.json 생성 (mcc_details[], electric_wires[], electrictrays[])

전기계산서 생성 흐름:
  → [1단계] elec_equip_load_list 생성
       공정 설비 목록 → MCC 그룹 배정 → 부하 초기 데이터 입력
       auto_fill: equipment_catalog 기준으로 power_kw / efficiency / pwr_factor / ctrl_method 자동 채움

  → [2단계] elec_power_equip_list 생성
       elec_equip_load_list 기반
       auto-fill/refresh-all: elec_selection_rules 기준으로 케이블/차단기/제어기기/MCC size 자동 선정

  → [3단계] elec_instrument_list 생성
       P&ID tag 기반
       auto_fill: equipment_cable_spec 기준으로 케이블/IO 자동 채움

  → [4단계] 전기계산서 출력
       elec_equip_load_list + elec_power_equip_list + elec_instrument_list 조합
       Excel (1s1s1a1s_electricalcapacity.xlsx 형식)

전기 도면 생성 흐름:
  → public API (mccd / mswd / lcpo) 호출
  → drawing_masters + drawing_files + MinIO 저장
```

핵심 원칙:

- 사용자가 수정한 값은 auto-fill refresh보다 우선 보존한다.
- 동력값(power_kw)이 0인 설비는 전기계산서 산출 대상에서 제외한다.
- 전기계산서와 전기 도면은 같은 elec_power_equip_list 데이터를 공유한다.

---

## 3. 자료 원천 (참조 파일)

| 구분 | 파일 | 역할 |
|---|---|---|
| 전기계산서 최종 성과품 기준 | `99_reference/electrical-design/originals/attachments/elec/1s1s1a1s_electricalcapacity.xlsx` | 최종 출력 시트 구조·산출물 형태 기준 |
| 전기계산서 개발 참고 | `99_reference/electrical-design/originals/260106_전기계산서(최종샘플).xlsx` | 개발 과정 참고용. 최종 출력 기준 아님 |
| 기계 카탈로그 | `99_reference/electrical-design/originals/카탈로그_기계_v1.5.0.xlsx` | 설비별 전기 속성 원천 |
| 전기 카탈로그 | `99_reference/electrical-design/originals/카탈로그_전기_v1.3.0.xlsx` | 전기 품목 참조 |
| 계측기 카탈로그 | `99_reference/electrical-design/originals/카탈로그_계측기_v.1.3.0.xlsx` | 계측기 전원/신호/케이블 기준 |
| API 샘플 (공정계산 결과) | `99_reference/electrical-design/api-samples/report.json` | 설비별 EQP.*.* 전기 속성 확인용 |
| API 샘플 (3D 프로젝트 상태) | `99_reference/electrical-design/api-samples/project.json` | mcc_details[], electric_wires[] 구조 확인용 |
| 기준정보 Reference Map | `99_reference/electrical-design/korean_electrical_design_reference_map.md` | KEC/KS/제조사 기준 추적 |

---

## 4. 전기 초기 데이터 구조

### 4.1 report.json → 전기 초기 데이터 매핑

`report.json.equipments[]` 배열의 각 공정 객체 안에 `EQP.{설비키}.{속성}` 형태로 설비별 전기 속성이 존재한다.

`equipments[]` 배열은 두 구조로 모두 접근 가능하다:

- `values[]`: 키가 `"EQP.water_transfer_pump.power_kW"` 형태 (flattened)
- `equipments[]`: 객체 구조 `EQP.water_transfer_pump.power_kW` (nested)

두 구조 모두 같은 데이터를 담으며, `equipments[]` 안의 nested 구조 사용을 권장한다.

**전기계산에 필요한 report.json 필드:**

| report.json 키 | DB 필드명 | 단위 | 설명 |
|---|---|---|---|
| `EQP.*.power_kW` | `power_kw` | kW | 정격 동력 |
| `EQP.*.ctrl_method` | `ctrl_method` | 코드 | 기동방식 (S_SYS01~04) |
| `EQP.*.efficiency_percent` | `efficiency_percent` | **0~1 형태** (예: 0.895) | 효율 |
| `EQP.*.pwr_factor_percent` | `pwr_factor_percent` | **0~1 형태** (예: 0.9) | 역률 |
| `EQP.*.demand_factor_percent` | `demand_factor_percent` | **% 형태** (예: 60.0 = 60%) | 수용률 |
| `EQP.*.rated_volt_V` | `rated_volt_v` | V | 정격 전압 |
| `EQP.*.normal_count` | `normal_quantity` | EA | 상용 수량 |
| `EQP.*.spare_count` | `spare_quantity` | EA | 예비 수량 |
| `EQP.*.code_key` | `equipment_type` | 코드 | 기준정보 조회 key (M_AGT0602 등) |
| `EQP.*.tag_number` | `mcc_equip_no` | 문자열 | 전기 기기 번호 (M-101 등) |

> **✅ 확정 — 단위 정규화 규칙**
> - `efficiency_percent`, `pwr_factor_percent`: DB에 0~1 형태로 저장됨. 계산식에서 그대로 사용.
> - `demand_factor_percent`: DB에 % 형태로 저장됨 (60.0 = 60%). 수용부하 계산 시 `/100` 필요.
> - DB에 저장된 efficiency는 표시용으로 반올림될 수 있음 (예: 0.895 → 0.90). 부하계산은 equipment_catalog 원본값 기준으로 실행됨.

### 4.2 기동방식 코드

| 코드 | 의미 | CV 코어 수 | 제어기기 | 조작반 타입 | 차단기 계열 |
|---|---|---|---|---|---|
| `S_SYS01` | 직입기동 | 3C | MC + EOCR + 콘덴서 | LOP | ABS |
| `S_SYS02` | 인버터 | 3C | 인버터 | LOP | ABS |
| `S_SYS03` | Soft Starter | 3C | Soft Starter | LOP | ABS |
| `S_SYS04` | MOP | **4C** | 없음 | MOP | **EBS** |
| `S_SYS05` | ⚠️ 미사용 | - | - | - | ABS (규칙 확인됨) |

> `ctrl_method_value` (표시명): 직입기동, 인버터, 소프트스타터, MOP — project.json mcc_details[]에서 확인됨. ✅  
> ⚠️ S_SYS05: elec_selection_rules에 breaker/mcc_size 규칙 존재하나, 실제 사용 프로젝트 없음 (DB 조회 결과 0건). mcc_size=600mm 전 범위 고정. 코드 의미 개발팀 확인 필요.

---

## 5. 전기 기준정보 구조

### 5.1 elec_selection_rules 테이블

`bkt_wai_design.elec_selection_rules` 테이블에 모든 자동선정 규칙이 저장된다.

| `rule_type` | `rule_name` | 입력 | 조건 | 결과 필드 | 비고 |
|---|---|---|---|---|---|
| `cable` | `machine_cv_gv_cable_reference` | `rated_current_a` (A) | `min_value ≤ X < max_value` | `cv_crosssection_mm2`, `gv_crosssection_mm2` | starting_method 무관 |
| `cable_diameter` | `cv_cable_outer_diameter_reference` | `(crosssection_mm2, core_count)` | 복합 | 외경 mm | 64개 규칙 |
| `cable_diameter` | `cvv_cable_outer_diameter_reference` | `(crosssection_mm2, core_count)` | 복합 | 외경 mm | 12개 규칙 |
| `cable_diameter` | `cvv_sb_cable_outer_diameter_reference` | `(crosssection_mm2, core_count)` | 복합 | 외경 mm | 12개 규칙 |
| `cable_diameter` | `gv_cable_outer_diameter_reference` | `crosssection_mm2` | 단순 범위 | 외경 mm | 13개 규칙 |
| `conduit` | `conduit_reference` | **케이블 단면적 합계 (mm²)** | `min_value ≤ X < max_value` | `conduit_size_c_NONE` | 9개 규칙 |
| `breaker` | `circuit_breaker_reference` | `rated_current_a` (A) | `min_value ≤ X < max_value` + `starting_method` | `breaker_model` | 기동방식별 별도 규칙 |
| `mc` | `mc_reference` | `power_kw` (kW) | `min_value ≤ X < max_value` | `mc_model` | `S_SYS01`만 해당 |
| `eocr` | `eocr_reference` | `power_kw` (kW) | `min_value ≤ X < max_value` | `eocr_model` | `S_SYS01`만 해당 |
| `inverter` | `inverter_reference` | `power_kw` (kW) | `min_value ≤ X < max_value` | `inverter_model` | `S_SYS02`만 해당 |
| `soft_starter` | `soft_starter_reference` | `power_kw` (kW) | `min_value ≤ X < max_value` | `soft_starter_model` | `S_SYS03`만 해당 |
| `capacitor` | `capacitor_reference` | `power_kw` (kW) | `min_value ≤ X < max_value` | `capacitance_uf` (string, "-"는 해당없음) | `S_SYS01`만 해당 ✅ |
| `mcc_size` | `mcc_size_reference` | `power_kw` (kW) | `min_value ≤ X < max_value` + `starting_method` | `mcc_size_mm` | 기동방식별 별도 규칙 |

### 5.2 CV/GV 선정 규칙 (확정) ✅

입력: `rated_current_a`  
조회: `elec_selection_rules WHERE rule_type='cable' AND min_value ≤ rated_current_a < max_value`  
결과: `cv_crosssection_mm2`, `gv_crosssection_mm2`

**전체 규칙표 (METRIC, 단위: A → mm²):**

| 상용전류 범위 (A) | CV 단면적 (mm²) | GV 단면적 (mm²) |
|---:|---:|---:|
| 0 ~ 24.44 | 4 | 4 |
| 24.44 ~ 31.43 | 6 | 6 |
| 31.43 ~ 43.65 | 10 | 10 |
| 43.65 ~ 58.20 | 16 | 16 |
| 58.20 ~ 73.91 | 25 | 16 |
| 73.91 ~ 91.96 | 35 | 16 |
| 91.96 ~ 125.71 | 50 | 25 |
| 125.71 ~ 162.38 | 70 | 35 |
| 162.38 ~ 199.04 | 95 | 50 |
| 199.04 ~ 232.80 | 120 | 70 |
| 232.80 ~ 270.05 | 150 | 95 |
| 270.05 ~ 310.21 | 185 | 95 |
| 310.21 ~ 368.99 | 240 | 120 |
| 368.99 ~ 428.35 | 300 | 150 |
| 428.35 이상 | 400 | 300 |

> **검증 (DB):** `elec_selection_rules WHERE rule_type='cable'` 전체 15행 직접 조회 — 위 표의 전류 범위 및 CV/GV 단면적 수치 일치 확인 ✅

CV 코어 수 결정: ✅
- `S_SYS01 / S_SYS02 / S_SYS03`: **3C** (3상 전력선. GV는 별도 케이블)
- `S_SYS04` (MOP): **4C** (3상 전력선 + PE 내장. GV는 별도 없음)

따라서 최종 규격 조합:
- S_SYS01~03: `cable_cv = "{crosssection}SQ 3C"`, `cable_gv = "{crosssection}SQ"`
- S_SYS04: `cable_cv = "{crosssection}SQ 4C"`, `cable_gv = "{crosssection}SQ"` ← GV도 있음. 표시 형태 소스 확인 필요 ⚠️

### 5.3 전선관 선정 규칙 (확정) ✅

입력: 케이블 외경 단면적 합계 (mm²)  
계산: `π × (outer_diameter_mm / 2)²` 합산  
조회: `elec_selection_rules WHERE rule_type='conduit' AND min_value ≤ 합계 < max_value`  
결과: `conduit_size_c_NONE` (단위: C, 예: 28C)

**전선관 규칙표:**

| 단면적 합계 범위 (mm²) | 전선관 규격 |
|---:|:---:|
| 0 ~ 67.02 | 16C |
| 67.02 ~ 126.71 | 22C |
| 126.71 ~ 201.06 | 28C |
| 201.06 ~ 314.16 | 36C |
| 314.16 ~ 452.39 | 42C |
| 452.39 ~ 706.86 | 54C |
| 706.86 ~ 1134.11 | 70C |
| 1134.11 ~ 1809.56 | 82C |
| 1809.56 이상 | 104C |

> **검증 (DB):** `elec_selection_rules WHERE rule_type='conduit'` 9행 직접 조회 — 위 표의 면적 범위 및 전선관 규격 일치 확인 ✅

`conduit_power` (동력 전선관) 산출: ✅
- S_SYS01/02/03: `π×(outer_diameter_cv/2)² + π×(outer_diameter_gv/2)²` 합산 후 조회
- S_SYS04: `π×(outer_diameter_cv/2)²`만 사용

`conduit_control` (제어 전선관) 산출: ✅
- CVV와 CVV-SB는 동시에 들어갈 수 있음 (PLC 전선 참조표 기준)
- `π×(outer_diameter_cvv/2)² + π×(outer_diameter_cvv_sb/2)²` 합산 후 조회
- S_SYS04(MOP)도 conduit_control 존재 — CVV-SB 기준 ✅
- conduit_control = NULL 조건: `equipment_cable_spec`에 CVV/CVV-SB 미등록인 경우 (예: M_PMP1402) ✅

> **검증 (DB):** `elec_power_equip_list WHERE project_id='1s1s1a1s'` 조회 — M-203(장비유형 M_PMP1402) conduit_control=NULL 확인, M-204·M-205(S_SYS04) conduit_control CVV-SB 기준 산출 확인 ✅  
> **검증 (DB):** `equipment_cable_spec WHERE code_key='M_PMP1402'` 조회 — CVV/CVV-SB 미등록 확인(conduit_control=NULL 원인) ✅

### 5.4 차단기 선정 규칙 (확정) ✅

입력: `rated_current_a` + `ctrl_method`  
조회: `elec_selection_rules WHERE rule_type='breaker' AND starting_method=ctrl_method AND min_value ≤ rated_current_a < max_value`  
결과: `breaker_model`

규칙 특이점:
- `S_SYS04` (MOP): **EBS** 계열 차단기 사용 (예: EBS 34/3, EBS 204/150)
- `S_SYS01 / S_SYS02 / S_SYS03 / S_SYS05`: **ABS** 계열 차단기 사용 (예: ABS 33/10, ABS 63/60)

> **검증 (DB):** `elec_selection_rules WHERE rule_type='breaker'` 165행 조회 — starting_method별 ABS(S_SYS01~03)/EBS(S_SYS04) 계열 분리 확인, `elec_power_equip_list` 샘플 데이터와 100% 일치 ✅  
> ⚠️ DB 규칙 테이블의 breaker_model (예: ABS 34/10)과 실제 저장된 모델명 (예: ABS 33/10) 사이에 미세 차이가 확인됨. 소스코드에서 추가 매핑 로직 여부 확인 필요.

### 5.5 MC 선정 규칙 (확정) ✅

적용 대상: `S_SYS01` (직입기동)만 해당. 나머지 기동방식은 MC 없음.  
입력: `power_kw`  
결과: `mc_model`

| power_kw 범위 | MC 모델 |
|---:|:---|
| 0 ~ 3.0 | MC-6a |
| 3.0 ~ 4.0 | MC-9a |
| 4.0 ~ 5.5 | MC-12a |
| 5.5 ~ 7.5 | MC-18a |
| 7.5 ~ 15.0 | MC-32a |
| 15.0 ~ 18.5 | MC-40a |
| 18.5 ~ 22.0 | MC-50a |
| 22.0 ~ 30.0 | MC-65a |
| 30.0 ~ 37.0 | MC-75a |
| 37.0 ~ 45.0 | MC-85a |
| 45.0 이상 | MC-105a |

### 5.6 EOCR 선정 규칙 (확정) ✅

적용 대상: `S_SYS01` (직입기동)만 해당.  
입력: `power_kw`  
결과: `eocr_model`

| power_kw 범위 | EOCR 모델 |
|---:|:---|
| 0 ~ 3.55 | DMP06i-TZ |
| 3.55 이상 | DMP60i-TZ |

### 5.7 MCC size 선정 규칙 (확정) ✅

입력: `power_kw` + `ctrl_method`  
조회: `elec_selection_rules WHERE rule_type='mcc_size' AND starting_method=ctrl_method`  
결과: `mcc_size_mm`

> ✅ **DB 참조표 우선 원칙**: mcc_size는 기동방식(starting_method)별로 독립된 참조행이 존재하므로, 구현 시 ctrl_method를 그대로 입력해 DB 조회. 아래 표는 S_SYS01 예시이며 타 기동방식은 DB에서 직접 조회.

S_SYS01 기준 규칙표 (참고용, 실제 구현은 DB 조회):

| power_kw 범위 | MCC size (mm) |
|---:|---:|
| 0 ~ 5.5 | 200 |
| 5.5 ~ 11.0 | 300 |
| 11.0 ~ 18.5 | 300 |
| 18.5 ~ 30.0 | 400 |
| 30.0 ~ 45.0 | 400 |
| 45.0 ~ 75.0 | 600 |
| 75.0 ~ 110.0 | 700 |
| 110.0 ~ 132.0 | 1000 |
| 132.0 ~ 200.0 | 1200 |

### 5.8 equipment_cable_spec (확정) ✅

`bkt_wai_design.equipment_cable_spec` 테이블. 설비/계측기 코드별 PLC 신호 수량과 케이블 규격 정의.

| 컬럼 | 설명 |
|---|---|
| `code_key` | 장비 타입 코드 (M_AGT0602 등) |
| `reference_type` | `MACHINE` 또는 `INSTRUMENT` |
| `has_di` | DI 수량 (정수, null=0) |
| `has_do` | DO 수량 (정수, null=0) |
| `has_ai` | AI 수량 (정수, null=0) |
| `has_ao` | AO 수량 (정수, null=0) |
| `has_rs485` | RS485 수량 (정수, null=0) |
| `has_ethernet` | Ethernet 수량 (정수, null=0) |
| `cvv_spec` | CVV 케이블 규격 (예: 1.5SQ 6C) |
| `cvv_sb_spec` | CVV-SB 케이블 규격 (예: 1.5SQ 2C) |
| `cv_spec` | 전원 케이블 규격 (계측기 전용) |
| `gv_spec` | 접지선 규격 (계측기 전용) |

> MACHINE 타입: cv_spec/gv_spec은 null. 동력 CV/GV는 elec_selection_rules.cable 규칙으로 산출.  
> INSTRUMENT 타입: cv_spec/gv_spec이 직접 정의됨 (예: I_WTG02 → cv=2.5SQ 3C, gv=4SQ).

---

## 6. 전기계산서 산출 과정

### 6.1 산출 시트 구조 (최종 성과품 기준)

최종 성과품: `1s1s1a1s_electricalcapacity.xlsx`  
(`260106_전기계산서(최종샘플).xlsx`는 개발 참고자료이며 최종 출력 기준 아님)

| 시트명 | 원천 테이블 | 주요 산출 항목 |
|---|---|---|
| 동력설비 부하계산서 | `elec_equip_load_list` | 부하용량, 전류, 수용률 |
| 부하일람표 | `elec_equip_load_list` (TITLE 행 집계) | MCC별 부하 합계 |
| 동력설비 리스트 | `elec_power_equip_list` | 케이블, 차단기, 제어기기, MCC size |
| 계측기리스트 | `elec_instrument_list` | 케이블, 전선관, IO |
| LOP면수산출서 | `elec_equip_load_list.control_panel_type` | LOP 수량 |
| IO MCC | `elec_power_equip_list.plc_cable_*` | 동력설비 DI/DO/AI/AO |
| IO 계측제어 | `elec_instrument_list.plc_cable_*` | 계측기 DI/DO/AI/AO |
| IO 집계표 | IO MCC + IO 계측제어 합산 | spare 20% + 카드 수량 |
| 케이블스케쥴(동력) | `elec_power_equip_list` (CV, GV) | FROM/TO/규격/길이 |
| 케이블스케쥴(제어) | `elec_power_equip_list` (CVV, CVV-SB) | FROM/TO/규격/길이 |
| 케이블스케쥴(계측) | `elec_instrument_list` | FROM/TO/규격/길이 |

> **검증 (MinIO):** 전체 버킷(wai-output-statement, wai-project, wai-formula-library 등) 대상 `elec/electrical/계산서/capacity` 키워드 조회 — 전기계산서 xlsx 파일 0건. MinIO에 저장되지 않음 확인 ✅  
> **사용자 확인:** 전기계산서는 버튼 클릭 시 즉시 생성되는 온디맨드 스트림 방식. 파일로 저장되지 않고 HTTP 응답으로 직접 반환됨 ✅  
> ❓ `1s1s1a1s_electricalcapacity.xlsx` 시트별 컬럼/셀 정확한 매핑표 미완성. 샘플 Excel 직접 분석 필요.

### 6.2 부하 계산 (확정) ✅

**전제 조건:**
- 정격 전압: **380V 3상 전용** ✅. DB에 380V 기준 데이터만 입력됨. 220V 단상·440V·6.6kV 등 다른 전압은 현재 미지원 — **제외 범위** (DB 미구현).
- 단상 설비 처리 ⚠️ 소스코드 확인 필요.
- 0kW 설비는 전기계산서 산출 대상에서 제외. ✅

**ITEM 행 계산 산식:**

```
부하용량(kVA) = power_kW ÷ (efficiency_percent × pwr_factor_percent)  ← 소수점 2자리 반올림 ✅
  → efficiency_percent, pwr_factor_percent: 0~1 형태 그대로 사용

정격전류(A) = power_kW × 1000 ÷ (√3 × rated_volt_V × efficiency_percent × pwr_factor_percent)
  → √3 = 1.732
  → 검증: M-101 → 3.7 × 1000 / (1.732 × 380 × 0.895 × 0.9) = 6.98A ✅

상용전류(A) = 정격전류(A) × normal_quantity
  → normal_current_a = rated_current_a × normal_quantity
  → 검증: M-101 → 6.98 × 2 = 13.96A ✅

적용동력(kW) = power_kW × normal_quantity
  → normal_power_kw = power_kW × normal_quantity

적용부하(kVA) = 부하용량(kVA) × normal_quantity
  → normal_load_kva = load_capacity_kva × normal_quantity

수용동력(kW) = normal_power_kw × (demand_factor_percent / 100)
수용부하(kVA) = normal_load_kva × (demand_factor_percent / 100)
  → demand_factor_percent는 % 형태 (60.0 = 60%) → /100 필요
```

**TITLE 행 집계 산식 (MCC 대표값) ✅:**

```
MCC 대표 상용전류(A) = SUM(ITEM.normal_current_a) + MAX(ITEM.normal_current_a) × 0.1
  → 검증: MCC1 → 399.25 + 265.44×0.1 = 425.79 ≈ 425.78A ✅

MCC 대표 적용동력(kW) [normal_power_kw] = SUM(ITEM.power_kw × ITEM.normal_quantity) ✅
  → 각 ITEM의 동력(kW) × 상용수량 합산

MCC 대표 적용부하(kVA) [normal_load_kva] = SUM(ITEM.rated_current_a × ITEM.normal_quantity)
                                            + MAX(ITEM.rated_current_a × ITEM.normal_quantity) × 0.1 ✅
  → 상용전류 합 + 최대 상용전류 × 0.1 (normal_current_a 산정 방식 동일 적용)
  → ⚠️ 이전 버전: SUM(ITEM.normal_load_kva) 방식과 다름. 위 공식이 최종 확정

MCC 대표 수용률(%) [demand_factor_percent] = AVG(ITEM.demand_factor_percent) ✅
  → 하위 ITEM 수용률 단순 평균 (가중평균 아님)
  → 검증: MCC1 → demand=60.80% ✅
```

> **검증 (DB):** `elec_equip_load_list WHERE project_id='1s1s1a1s' AND field_type='TITLE'` 조회 — MCC1 normal_current_a=425.78A (Σ+MAX×0.1 공식 일치), demand_factor_percent=60.80% (평균값) ✅

### 6.3 MCC 그룹핑 (확정 부분) ✅

**확정된 사항:**
- 설비를 기기번호(mcc_equip_no) 순으로 정렬한다.
- 사용자가 설정한 한계 상용 전류값 기준으로 MCC 분할한다.
- 누적 상용전류가 한계값 초과 시 다음 MCC로 넘긴다.
- MCC 번호는 `MCC1`, `MCC2` 등 순차 자동 부여.
- TITLE 행: `field_type = "TITLE"`, `mcc_equip_no = "MCC1"` 등.
- ITEM 행: `field_type = "ITEM"`.

**MCC 피더 케이블 (TITLE 행) 고정값: ✅**
- `std_distance_m = 30.00` (MCC 피더는 30m 고정)
- `conduit_length_m = NULL` (피더 케이블은 전선관 별도 없음)
- `ctrl_method = "-"` (피더 행은 기동방식 없음)
- `mc_model = "-"`, `eocr_model = "-"`, `inverter_model = "-"`, `soft_starter = "-"`
- `cable_cv` = cable rule(normal_current_a) → **항상 4C** ✅ (예: 22.45A→4SQ 4C, 145.42A→70SQ 4C)
- `cable_gv` = cable rule(normal_current_a) → gv_crosssection_mm2 ✅ (예: 145.42A→35SQ)
- `breaker_model` = breaker rule(starting_method=S_SYS01, normal_current_a) → **ABS 계열 고정** ✅
- `ct_primary_a`: CT 1차 정격 — **차단기 AT값 / 5A** 형식 ✅ (예: ABS 34/25 → "25/5A")
- `spd_capacity_ka`: SPD 용량 (kA) — MCC 기본 설치 ✅
- `spd_breaker_rating_a`: SPD 차단기 — **AT 75 이상이면 "ABS 104/75" 고정, 75 미만이면 동일 차단기** ✅
- `mcc_size_mm = 600` — elec_selection_rules 참조표 기준 자동 산출 (starting_method=None 적용) ✅

> **검증 (DB):** 4개 프로젝트 TITLE 행 전체 24개 교차조회 (`elec_power_equip_list WHERE field_type='TITLE'`) — cable rule(normal_current_a) 결과와 실제 cable_cv 100% 일치(전 항목 4C 형식), breaker rule(S_SYS01, normal_current_a) 결과와 실제 breaker_model 100% 일치(전 항목 ABS 계열) ✅

**미확정:**
- ✅ 한계 상용 전류값: UI 전기설계 설정 항목에서 사용자가 직접 설정
- ✅ **mcc_panel_count 기준**: MCC 설치 가능 높이 2800mm 기준. 기자재를 기기번호 순으로 순차 배치하며, 누적 mcc_size_mm 합계가 2800mm 초과 시 다음 판넬로 이동. 산출 로직 상세는 소스코드 확인 필요 (COM-1).

### 6.4 동력설비 리스트 자동선정 순서 (확정) ✅

`elec_power_equip_list` 각 ITEM 행에 대해 다음 순서로 자동선정한다:

```
1. 전선 선정
   ① elec_selection_rules[cable] 에서 rated_current_a 기준으로 cv_crosssection_mm2, gv_crosssection_mm2 조회
   ② 코어 수 결정: S_SYS01/02/03 → 3C, S_SYS04 → 4C
   ③ cable_cv = "{crosssection}SQ {3 또는 4}C"
   ④ cable_gv = "{crosssection}SQ"

2. 전선 외경 조회
   ① elec_selection_rules[cable_diameter, cv_cable_outer_diameter_reference] → outer_diameter_cv
   ② elec_selection_rules[cable_diameter, gv_cable_outer_diameter_reference] → outer_diameter_gv
   ③ CVV: equipment_cable_spec에서 code_key 기준으로 cvv_spec 조회
   ④ elec_selection_rules[cable_diameter, cvv_cable_outer_diameter_reference] → outer_diameter_cvv
   ⑤ CVV-SB: equipment_cable_spec에서 cvv_sb_spec 조회
   ⑥ elec_selection_rules[cable_diameter, cvv_sb_cable_outer_diameter_reference] → outer_diameter_cvv_sb

3. 전선관 선정 ⚠️ (conduit_power/control은 3D 배선 연동 전까지 NULL — 기본값)
   ① conduit_power: 동력 케이블 외경 단면적 합산 → elec_selection_rules[conduit] 조회
      - S_SYS01/02/03: π×(d_cv/2)² + π×(d_gv/2)²
      - S_SYS04: π×(d_cv/2)²만 사용
   ② conduit_control: 제어 케이블 외경 단면적 합산 → elec_selection_rules[conduit] 조회
      - CVV + CVV-SB 동시 합산: π×(d_cvv/2)² + π×(d_cvv_sb/2)²  ✅ (equipment_cable_spec DB 참조표 기준)
      - CVV/CVV-SB 조합은 equipment_cable_spec에 따라 장비마다 다름 — DB 참조표가 기준 ✅
      - conduit_control = NULL: equipment_cable_spec에 CVV/CVV-SB 미등록 시  ✅

4. 차단기 선정
   elec_selection_rules[breaker, starting_method=ctrl_method] 에서 rated_current_a 기준 조회
   → breaker_model

5. MC 선정 (S_SYS01만)
   elec_selection_rules[mc] 에서 power_kw 기준 조회 → mc_model

6. EOCR 선정 (S_SYS01만)
   elec_selection_rules[eocr] 에서 power_kw 기준 조회 → eocr_model

7. 인버터 선정 (S_SYS02만)
   elec_selection_rules[inverter] 에서 power_kw 기준 조회 → inverter_model

8. Soft Starter 선정 (S_SYS03만)
   elec_selection_rules[soft_starter] 에서 power_kw 기준 조회 → soft_starter (field명)

9. 콘덴서 선정 (S_SYS01만) ✅
   elec_selection_rules[capacitor] 에서 power_kw 기준 조회
   result_data.capacitance_uf (string) → elec_power_equip_list.condenser (varchar)
   0.75kW 미만 → "-" (해당없음), 0.75kW 이상 → "7.5"/"10"/"15"/"20"/"30"/"40"/"50"/"75"/"100"/"150"… (μF 값)

10. MCC size 선정
    elec_selection_rules[mcc_size, starting_method=ctrl_method] 에서 power_kw 기준 조회
    → mcc_size_mm

11. PLC 케이블/IO 설정
    equipment_cable_spec[code_key=equipment_type] 조회
    → plc_cable_di, plc_cable_do, plc_cable_ai, plc_cable_ao, plc_cable_rs485
    → plc_cable_cvv, plc_cable_cvv_sb (cvv_spec, cvv_sb_spec에서)

12. 제어반 타입 설정
    S_SYS01 / S_SYS02 / S_SYS03 → control_panel_type = "LOP"
    S_SYS04 → control_panel_type = "MOP"
```

### 6.5 계측기 리스트 자동선정 ✅

`elec_instrument_list` 각 행에 대해:

```
1. equipment_cable_spec[code_key=equipment_type, reference_type='INSTRUMENT'] 조회
2. cable_cv = cv_spec, cable_gv = gv_spec
3. plc_cable_cvv_sb = cvv_sb_spec (계측기는 대부분 CVV-SB 사용, CVV는 없음)
4. plc_cable_ai, plc_cable_di 등 = has_ai, has_di 수량
5. outer_diameter_cv, outer_diameter_gv 조회
6. conduit_power: π×(d_cv/2)² + π×(d_gv/2)² → elec_selection_rules[conduit] 조회
7. conduit_control: π×(d_cvv/2)² + π×(d_cvv_sb/2)² → elec_selection_rules[conduit] 조회  ✅
   (CVV/CVV-SB 동시 가능, 미등록 시 NULL)
```

> ⚠️ 계측기 code_key (I_WTG02, I_PHM02 등) 매핑: P&ID에서 tag가 생성될 때 equipment_type이 지정됨. 계측기 원천 데이터 흐름 (P&ID → elec_instrument_list) 상세 확인 필요.  
> 일부 계측기 타입은 equipment_cable_spec에 데이터 없음 (null). 처리 정책 ⚠️ 소스코드 확인 필요.

### 6.6 IO 집계 (공식 확정 ✅, 카드 점수 ✅ 확정)

**IO 집계 공식 (확정) ✅:**

```
IO합계(타입별) = Σ(elec_power_equip_list.plc_cable_{type} × total_quantity)  ← ITEM 행만
              + Σ(elec_instrument_list.plc_cable_{type} × quantity)

spare_IO(타입별) = ceil(IO합계 × 1.2)    ← 올림
카드 수 = ceil(spare_IO / 카드_점수)
```

**GWD 프로젝트 검증 ✅ (`019e4d2e`):**

| 출처 | DI | DO | AI | RS485 |
|---|---|---|---|---|
| 동력 (power, ×total_qty) | 40 | 12 | 0 | 1 |
| 계측기 (instrument, ×qty) | 4 | 0 | 5 | 0 |
| **합계** | **44** | **12** | **5** | **1** |
| spare 20% (ceil) | 53 | 15 | 6 | 2 |
| **카드 수 ✅** | **2장** (32pt) | **1장** (32pt) | **1장** (8pt) | **1장** (2pt) |

동력 IO 상세 (×total_quantity):
- M-101(total=2): DI=5→10, DO=1→2
- M-102(total=3): DI=3→9, DO=1→3
- M-103(total=3): DI=3→9, DO=1→3
- M-202(total=1): RS485=1 (DI/DO/AI 없음)
- M-203(total=3): DI=3→9, DO=1→3
- M-204(total=1): DI=3→3, DO=1→1
- M-205(total=1): IO 없음

계측기 IO 상세 (×quantity):
- LIT-1001(qty=1): AI=1
- FIT-2301(qty=2): DI=1→2, AI=1→2
- FIT-2101(qty=2): DI=1→2, AI=1→2

> **카드당 점수 (IO집계표 확정 ✅)**: DI=32pt/카드, DO=32pt/카드, AI=8pt/카드, AO=8pt/카드, COMM(RS485)=2pt/카드  
> RS485: Actual=1 → spare ceil(1×1.2)=2pt → ceil(2/2pt)=1장  
> ⚠️ 이 기준의 저장 위치 (소스코드 하드코딩 vs DB 기준정보 테이블) 확인 필요.

### 6.7 케이블 스케줄 (방향 확정, 거리 산출 ⚠️)

**FROM/TO 규칙 ✅:**
- FROM: 설비가 속한 MCC 번호 (예: MCC1)
- TO: 설비 기기번호 (예: M-101A, M-101B)
- 동일 설비의 total_quantity ≥ 2 → A/B/C suffix 부여
  - normal_quantity 개수: A, B, (C) → 상용
  - spare_quantity 개수: 이어서 suffix
  - 예: normal=2, spare=1 → M-102A, M-102B, M-102C ✅

**거리 산출:**
```
std_distance_m:
  - 3D 배선 경로 설정된 경우: 실제 3D 경로 길이 (electric_wires[].points[].magnitude 합산 추정)
  - 3D 경로 미설정: 0m
  - TITLE 행 (MCC 피더): 30m 고정 ✅
  - 계측기 전체: 30m 고정 ✅

conduit_length_m:
  - 전체 배선 거리 중 전선관 구간 길이 (Tray 구간 제외)
  - std_distance_m = 0 → conduit_length_m = 0 ✅
  - TITLE 행: NULL (전선관 없음) ✅
  - std_distance_m > 0 → ⚠️ conduit_length_m 산출 공식 미확정. 소스코드(3D route 처리 코드) 확인 필요.
```

---

## 7. 전기 도면 산출 과정

### 7.1 전기 도면 종류

| 도면 | 원천 API | 데이터 원천 테이블 | 상태 |
|---|---|---|---|
| MCC 구성도 | `/api/public/v1/equipment/elec-power-equip-list/mccd` | `elec_power_equip_list` | ✅ API 확인 |
| 전동기기동반 결선도 | `/api/public/v1/equipment/elec-power-equip-list/mswd` | `elec_power_equip_list` | ✅ API 확인 |
| 현장조작반 외형도 | `/api/public/v1/equipment/elec-power-equip-list/lcpo` | `elec_power_equip_list` | ✅ API 확인 |
| 범례 | ❓ | ❓ | ❓ API/DB/템플릿 미확인 |

### 7.2 MCCD (MCC 구성도) 응답 필드 ✅

`GET /api/public/v1/equipment/elec-power-equip-list/mccd?project_id={uuid}`

| 응답 필드 | 도면 의미 |
|---|---|
| `project_name`, `site_address` | 도곽 정보 |
| `mcc_no` | MCC 번호 |
| `field_type` | TITLE 또는 ITEM |
| `mcc_equip_no` | MCC 장비 번호 |
| `equipment_name` | 장비명 |
| `ctrl_method_value` | 기동방식 표시명 (직입기동, 인버터 등) |
| `normal_quantity`, `spare_quantity`, `total_quantity` | 수량 |
| `mcc_size_mm` | MCC 반 폭 (mm) |

### 7.3 MSWD (전동기기동반 결선도) 응답 필드 ✅

`GET /api/public/v1/equipment/elec-power-equip-list/mswd?project_id={uuid}`

| 응답 필드 | 도면 의미 |
|---|---|
| `mcc_equip_no` | 회로/부하 번호 |
| `equipment_name` | 부하명 |
| `power_kw` | 동력 |
| `ctrl_method_value` | 기동방식 표시명 |
| `breaker_model` | 차단기 |
| `ct_primary_a` | CT 1차 정격 (TITLE 행에서) |
| `spd_capacity_ka` | SPD 용량 |
| `spd_breaker_rating_a` | SPD 차단기 |
| `condenser` | 콘덴서 |

### 7.4 LCPO (현장조작반 외형도) 응답 필드 ✅

`GET /api/public/v1/equipment/elec-power-equip-list/lcpo?project_id={uuid}`

| 응답 필드 | 도면 의미 |
|---|---|
| `mcc_equip_no` | 설비 번호 |
| `equipment_name` | 설비명 |
| `ctrl_method_value` | 기동방식 표시명 |
| `normal_quantity`, `spare_quantity`, `total_quantity` | 수량 |
| `control_panel_type` | 조작반 타입 (LOP/MOP) |

> LOP 대상: control_panel_type = "LOP" (S_SYS01/02/03 설비)  
> MOP 대상: control_panel_type = "MOP" (S_SYS04 설비)  
> `elec_equip_load_list`에 저장된 control_panel_type이 기준.

### 7.5 도면 파일 저장 구조

```
도면 데이터 조회 (public API)
  → 도면 생성 결과: SVG 형식으로 MinIO에 저장 ✅
  → drawing_masters: 도면 메타 저장 (drawing_number, drawing_title, drawing_status 등)
  → drawing_files: 파일 정보 (MinIO 경로, file_type, mime_type)
  → MinIO wai-drawing-files 버킷: 실제 도면 파일
```

> ✅ **MinIO 저장 경로 패턴 확인**: `wai-drawing-files/{file_id}/{filename}` (project_id 미포함, file_id 기준 flat 구조)  
> **검증 (MinIO):** `wai-drawing-files` 버킷 오브젝트 목록 직접 조회 — `{file_id}/{filename}` 경로 구조 확인, project_id 미포함 flat 구조 확인 ✅  
> ⚠️ **drawing_masters.project_id = NULL**: 현재 DB의 모든 drawing_masters 레코드에 project_id가 저장되지 않음. 전기 도면(MCCD/MSWD/LCPO) 타입도 현재 drawing_masters에 존재하지 않음 — 전기 도면 저장 방식 소스코드 확인 필요.  
> **검증 (DB):** `drawing_masters` 전체 828건 조회 — project_id=NULL 전수 확인, drawing_type 컬럼에 MCCD·MSWD·LCPO 타입 존재하지 않음 확인 ⚠️  
> ⚠️ SVG 도면 템플릿 위치, PDF/DXF 변환 로직 소스코드 확인 필요.  
> ❓ 범례 도면 데이터 원천 미확인.

---

## 8. 3D 전기 객체와 전기계산 연결

### 8.1 project.json 전기 관련 구조

| 경로 | 내용 |
|---|---|
| `electrictrays[]` | MCC 3D 객체 목록 |
| `electrictrays[].obj_id` | 3D 오브젝트 UUID |
| `electrictrays[].obj_name` | "MCC1", "MCC2" 등 |
| `electrictrays[].type` | "mcc" |
| `electrictrays[].columns` | 3D 표시용 column 수 |
| `electrictrays[].transformData[].pos` | MCC 3D 위치 좌표 |
| `electrictrays[].transformData[].scale` | MCC 3D 치수 |
| `electric_wires[]` | 배선 경로 |
| `electric_wires[].start_connector_id` | 시작 연결점 ID |
| `electric_wires[].end_connector_id` | 끝 연결점 ID |
| `electric_wires[].points[]` | 경로 좌표 배열 |
| `electric_wires[].points[].magnitude` | 해당 좌표까지의 누적 거리 (m) |
| `electric_connectors[]` | 설비 연결점 목록 |
| `mcc_details[]` | MCC 구성 상세 (기계 기준) |
| `mcc_details[].mccNo` | MCC 번호 |
| `mcc_details[].columns` | MCC column 수 (전기계산용) |
| `mcc_details[].equipments[]` | MCC 소속 설비 목록 |
| `mcc_details[].equipments[].mcc_equip_no` | 기기번호 (M-101 등) |
| `mcc_details[].equipments[].ctrl_method_value` | 기동방식 표시명 |
| `mcc_details[].equipments[].mcc_size_mm` | MCC unit 폭 |

> ⚠️ electric_wires[].points[].magnitude → std_distance_m 변환 로직 소스코드 확인 필요.  
> ⚠️ Tray 구간 제외 → conduit_length_m 변환 로직 소스코드 확인 필요.

---

## 9. 프로그램 구현 모듈 제안

```
ElectricalInputBuilder
  → 공정/equipment_catalog → elec_equip_load_list 초기 레코드 생성
  → MCC 그룹 배정 (mcc_no, field_type, TITLE 행 생성)
  → control_panel_type 자동 설정 (ctrl_method 기반)

ElectricalLoadCalculator
  → ITEM 행: 부하용량, 정격전류, 상용전류, 적용동력, 수용률 산출
  → TITLE 행: SUM + MAX×0.1 집계

ElectricalPowerEquipAutoFill
  → 전선 선정 → 외경 조회 → 전선관 선정
  → 차단기 선정 → MC/EOCR/인버터/SS/콘덴서 선정
  → MCC size 선정
  → PLC 케이블/IO 설정 (equipment_cable_spec 조회)

ElectricalInstrumentAutoFill
  → equipment_cable_spec 조회 → 케이블/IO/전선관 자동 설정

ElectricalRouteResolver
  → electric_wires[].points[].magnitude → std_distance_m ⚠️ 소스 확인 필요
  → Tray 구간 제외 → conduit_length_m ⚠️ 소스 확인 필요

IoScheduleGenerator
  → DI/DO/AI/AO/RS485 수량 집계
  → 20% spare → 카드 수량 산출

CableScheduleGenerator
  → FROM/TO 생성 (suffix A/B/C)
  → 길이 매핑 (std_distance_m)

ElectricalDrawingDataProvider
  → public API (mccd/mswd/lcpo) 호출
  → 범례 데이터 제공 ❓

ElectricalExportAdapter
  → Excel 전기계산서 출력 (1s1s1a1s_electricalcapacity.xlsx 형식) ⚠️ 매핑표 필요
  → SVG/PDF/DXF 도면 생성 ⚠️ 템플릿 확인 필요
  → drawing_masters + MinIO 저장
```

---

## 10. 검증 시나리오

### 10-1. 샘플 프로젝트 `1s1s1a1s` 기준

| 항목 | 검증 방식 | 기준값 (샘플) |
|---|---|---|
| 부하용량(kVA) | 산식 계산 vs DB 값 | M-101: 4.59kVA |
| 정격전류(A) | 산식 계산 vs DB 값 | M-101: 6.98A |
| 상용전류(A) | 산식 계산 vs DB 값 | M-101: 13.96A (×2) |
| TITLE 집계 전류 | SUM+MAX×0.1 vs DB | MCC1: 425.78A |
| CV 규격 | cable 규칙 조회 vs DB | M-101: 4SQ 3C |
| 전선관 규격 | 단면적 합산 vs DB | M-101 동력: 28C |
| 차단기 모델 | breaker 규칙 조회 vs DB | M-101: ABS 33/10 |
| MC 모델 | mc 규칙 조회 vs DB | M-101: MC-9a |
| EOCR 모델 | eocr 규칙 조회 vs DB | M-101: DMP60i-TZ |
| MCC size | mcc_size 규칙 조회 vs DB | M-101: 200mm |
| PLC CVV | equipment_cable_spec 조회 vs DB | M-101(M_AGT0602): 1.5SQ 8C |

### 10-2. GWD 프로젝트 (`019e4d2e`) — electricalcapacity.xlsx 교차검증 ✅

**설비 구성: 7 ITEM + 1 TITLE(MCC1)**

| 장비 | kW | ctrl | normal/spare | 차단기 | MC | EOCR | condenser | conduit_power | conduit_control |
|---|---|---|---|---|---|---|---|---|---|
| MCC1(TITLE) | 36.29 | — | 1/0 | ABS 104/100 | — | — | — | 54C | 22C |
| M-101 | 1.50 | S_SYS01 | 2/0 | ABS 33/3 | MC-6a | DMP06i-TZ | 10μF | 28C | 28C(공유) |
| M-102 | 7.50 | S_SYS01 | 2/1 | ABS 33/15 | MC-18a | DMP60i-TZ | 75μF | 28C | 28C(공유) |
| M-103 | 7.50 | S_SYS01 | 2/1 | ABS 33/15 | MC-18a | DMP60i-TZ | 75μF | 28C | 28C(공유) |
| M-202 | 1.30 | S_SYS04 | 1/0 | EBS 34/3 | — | — | — | 36C | 22C |
| M-203 | 0.40 | S_SYS02 | 2/1 | ABS 33/3 | — | — | — | 28C | 28C(공유) |
| M-204 | 1.50 | S_SYS01 | 1/0 | ABS 33/3 | MC-6a | DMP06i-TZ | 10μF | 28C | 28C(공유) |
| M-205 | 7.50 | S_SYS04 | 1/0 | EBS 34/15 | — | — | — | 36C | NULL |

> M-205 conduit_control=NULL: equipment_cable_spec에 CVV/CVV-SB 미등록 → NULL 규칙 ✅  
> M-202 conduit_control=22C (≠ conduit_power=36C): 별도 제어 전선관 사용 (공유 안 함) ✅  
> M-202 RS485=1 (PLC RS485 1회로, DI/DO/AI 없음) ✅

**TITLE(MCC1) 집계 검증:**

```
normal_current_a = SUM(5.86+27.62+27.62+2.54+2.08+0.03+13.81) + MAX(27.62)×0.1
                 = 79.56 + 2.762 = 82.32 ≈ 82.30A ✅

normal_power_kw  = 3.00+15.00+15.00+1.30+0.80+1.50+7.50 = 44.10 kW ✅

demand_factor    = AVG(60+80+80+60+80+60+60)/7 = 480/7 = 68.57 ≈ 68.60% ✅

cable_cv = 35SQ 4C (TITLE 4C 고정, cable rule(82.30A) → 35SQ) ✅
breaker  = ABS 104/100 (ABS 고정, breaker rule(S_SYS01, 82.30A) → AT100) ✅
ct       = 100/5A (AT=100 → "100/5A") ✅
spd_breaker = ABS 104/75 (AT=100 ≥ 75 → "ABS 104/75" 고정) ✅
mcc_size = 600mm ✅
```

> ⚠️ M-204 데이터 이상: efficiency_percent=86.50 (% 형태로 입력된 것으로 추정, 정상은 0.865)  
> → rated_current_a=0.03A로 계산됨 (1.5kW 장비로는 비정상적으로 낮은 값)  
> → 데이터 입력 오류 가능성. 소스코드에서 efficiency 단위 정규화 로직 확인 권장.

**LOP/MOP 면수 검증:**

| 타입 | 장비 | total_quantity | 소계 |
|---|---|---|---|
| LOP | M-101(S_SYS01), M-102(S_SYS01), M-103(S_SYS01), M-203(S_SYS02), M-204(S_SYS01) | 2+3+3+3+1 | **12 LOP** |
| MOP | M-202(S_SYS04), M-205(S_SYS04) | 1+1 | **2 MOP** |

> LOP 12개 전부 소용량(0.4~7.5kW) → 1회로 타입 ✅  
> `elec_equip_load_list.control_panel_type` 기준으로 LOP/MOP 집계 ✅

**IO 집계 검증:** → 섹션 6.6 참조 (DI=44→53, DO=12→15, AI=5→6, 카드 5장 ✅)

---

## 11. 미확정 항목 (⚠️ / ❓)

| # | 항목 | 상태 | 비고 |
|---|---|---|---|
| 1 | conduit_control CVV+CVV-SB 동시 합산 | ✅ 확정 | π×(d_cvv/2)²+π×(d_cvv_sb/2)², PLC 참조표 기준 |
| 2 | conduit_control=NULL 조건 | ✅ 확정 | equipment_cable_spec CVV/CVV-SB 미등록 시 (예: M_PMP1402) |
| 3 | S_SYS04 conduit_control | ✅ 확정 | CVV-SB 기준 |
| 4 | MCC 피더 mcc_size_mm=600 | ✅ 확정 | elec_selection_rules 참조표, 기동방식 None |
| 5 | CT 산출 로직 | ✅ 확정 | 차단기 AT값 / 5A 형식 (예: AT=10 → "10/5A") |
| 6 | SPD 설치/산출 | ✅ 확정 | MCC 기본 설치. AT 75 이상→ABS 104/75, 미만→동일 차단기 |
| 7 | 30m 고정 적용 대상 | ✅ 확정 | MCC TITLE 행 + 계측기(elec_instrument_list) 전체 |
| 8 | capacitor 선정 result_data 구조 | ✅ 확정 | result_data.capacitance_uf (string), condenser 필드 저장 |
| 9 | TITLE normal_power_kw 공식 | ✅ 확정 | SUM(power_kw × normal_quantity) |
| 10 | TITLE normal_load_kva 공식 | ✅ 확정 | SUM(상용전류) + MAX(상용전류) × 0.1 |
| 11 | TITLE demand_factor_percent 공식 | ✅ 확정 | AVG(ITEM.demand_factor_percent) 단순 평균 |
| 12 | load_capacity_kva 반올림 | ✅ 확정 | 소수점 2자리 반올림 |
| 13 | TITLE 피더 케이블/차단기 산정 | ✅ 확정 | cable rule(normal_current_a)→4C, breaker rule(S_SYS01, normal_current_a) |
| 14 | 도면 저장 방식 | ✅ 확정 | SVG → MinIO wai-drawing-files 버킷 |
| 15 | MinIO 경로 패턴 | ✅ 확정 | wai-drawing-files/{file_id}/{filename} (project_id 미포함) |
| 16 | 한계 상용 전류값 설정 위치 | ✅ 확정 | UI 전기설계 설정에서 사용자가 직접 설정 |
| 17 | mcc_size 기동방식별 참조 | ✅ 확정 | 기동방식별 DB 참조표 독립 존재, ctrl_method 그대로 입력해 조회 |
| 18 | CVV/CVV-SB 조합 기준 | ✅ 확정 | equipment_cable_spec DB 참조표 기준, 장비마다 다름 |
| 19 | conduit 기본값 | ✅ 확정 | 3D 배선 연동 전까지 NULL, 연동 후 계산 |
| 20 | S_SYS05 코드 의미 | ⚠️ 미사용 | DB 규칙 있으나 실사용 프로젝트 0건. 개발팀 확인 필요 |
| 21 | drawing_masters 전기 도면 저장 방식 | ⚠️ 소스코드 | 현재 MCCD/MSWD/LCPO 타입 미존재, project_id=NULL |
| 22 | conduit_length_m 산출 공식 (Tray 제외 구간) | ⚠️ 소스코드 | 3D route 처리 코드 |
| 23 | electric_wires → std_distance_m 변환 로직 | ⚠️ 소스코드 | points[].magnitude 합산 코드 |
| 24 | mcc_panel_count 산출 방식 | ⚠️ 소스코드 | mcc_size 누적 초과 시 분할 |
| 25 | 범례 도면 데이터 원천 | ❓ 미확인 | 소스코드 확인 필요 |
| 26 | 전기계산서 출력 방식 | ✅ 확정 | 버튼 클릭 시 즉시 생성 스트림, MinIO 비저장 (MinIO 조회 0건 확인) |
| 27 | electricalcapacity.xlsx 시트별 매핑 | ✅ 확정 | GWD 프로젝트 Excel 교차검증 완료 (11개 시트 전 항목 DB 일치) |
| 28 | 380V 외 전압 / 단상 설비 분기 처리 | ⚠️ 소스코드 | load calc 코드 |
| 29 | IO 집계 카드 점수 기준 (DI/DO/AI 점수/카드) | ✅ 확정 | DI=32pt/카드, DO=32pt/카드, AI=8pt/카드, COMM=2pt/카드. GWD IO집계표 직접 확인. 저장위치(DB vs 하드코딩) ⚠️ 소스코드 확인 필요 |
| 30 | 계측기 전선관 길이 산출 방식 | ⚠️ 소스코드 | elec_instrument_list에 거리 컬럼 없음. conduit 길이 어디서 오는지 확인 필요 |
| 31 | efficiency_percent 단위 정규화 로직 | ⚠️ 확인 권장 | M-204: efficiency=86.50 입력(비정상) → rated_current_a=0.03A 이상값 발생 |

---

## 12. 소스코드 확인 시 우선 검색 키워드

```
elec_equip_load_list
elec_power_equip_list
elec_instrument_list
auto_fill
auto-fill
refresh_all
refresh-all
mccd
mswd
lcpo
std_distance_m
conduit_length_m
electric_wires
points
magnitude
mcc_panel_count
capacitor_reference
S_SYS05
control_panel_type
drawing_masters
electricalcapacity
```
