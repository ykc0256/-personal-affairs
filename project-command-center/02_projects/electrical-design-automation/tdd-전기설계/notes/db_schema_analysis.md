# GWD DB 스키마 분석 — 전기설계 관련

원본: `8.(중간보고_제출용) bkt_WAI_Design 3.3.2차 테이블 목록 및 테이블 상세 설계서 혼합본.xlsx`  
스키마명: `bkt_wai_design`  
총 테이블 수: 71개 / 총 컬럼 정의: 약 795행

---

## 1. 전기설계 핵심 테이블

### `electrical_loads` — 전기 부하 상세 (21컬럼)

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| load_id | uuid | NO | PK |
| load_name | varchar(100) | NO | 부하 명칭 |
| load_type | varchar(50) | NO | 부하 유형 (모터/조명/계기 등) |
| power_rating | numeric(10) | YES | 소비 전력 (kW) |
| voltage | numeric(10) | YES | 전압 (V) |
| current_rating | numeric(10) | YES | 정격 전류 (A) |
| phase | integer | YES | 상수 (1/3상) |
| **power_factor** | numeric(4) | YES | **역률 (%)** |
| **efficiency** | numeric(5) | YES | **효율 (%)** |
| **starting_method** | varchar(30) | YES | **기동 방식** |
| operation_mode | varchar(30) | YES | 운전 모드 (연속/간헐) |
| duty_cycle | numeric(5) | YES | 가동 주기 (%) |
| running_hours_per_day | numeric(5) | YES | 일일 가동 시간 |
| full_load_ampere | numeric(8) | YES | 정격 전류값 (FLA) |
| project_id | uuid | YES | FK → projects |
| equipment_id | uuid | YES | FK → equipment_details |
| panel_id | uuid | YES | FK → electrical_system_panels |

### `electrical_system_panels` — MCC / 배전반 (23컬럼)

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| equipment_id | uuid | NO | PK |
| system_panel_type | varchar(20) | NO | SYSTEM / PANEL 구분 |
| panel_name | varchar(100) | NO | 패널 명칭 |
| panel_type | varchar(50) | NO | MCC / 배전반 / 제어반 / UPS 등 |
| voltage_level | varchar(20) | YES | LV / MV / HV |
| voltage | numeric(10) | YES | 정격 전압 (V) |
| current_rating | numeric(10) | YES | 정격 전류 (A) |
| bus_bar_rating | numeric(8) | YES | 버스바 정격 전류 (A) |
| number_of_circuits | integer | YES | 회로 수 |
| number_of_poles | integer | YES | 극수 |
| enclosure_type | varchar(30) | YES | IP 등급 (IP54/IP65) |
| panel_code | varchar(30) | YES | 패널 코드 |
| distribution_type | varchar(30) | YES | 배전방식 (Radial/Ring) |
| protection_scheme | jsonb | YES | 보호계전/차단기 구성 |
| dimensions | jsonb | YES | 외형 치수 |
| connected_equipment_ids | ARRAY | YES | FK ARRAY → equipment_details |
| dexpi_interface | jsonb | YES | DEXPI P&ID v1.4 연계 정보 |

### `electrical_cables` — 케이블 배치 (18컬럼)

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| equipment_id | uuid | NO | PK (케이블 자체 UUID) |
| cable_code | varchar(30) | NO | 케이블 규격 코드 |
| cable_name | varchar(100) | NO | 케이블 식별명 |
| cable_type | varchar(50) | NO | 전력 / 제어 / 통신 |
| conductor_size | varchar(20) | YES | 도체 굵기 (mm²) |
| insulation_type | varchar(50) | YES | 절연체 재질 (CV/GV/PVC/XLPE) |
| voltage_rating | numeric(10) | YES | 정격 전압 (V) |
| current_rating | numeric(10) | YES | 정격 전류 (A) |
| source_id | uuid | YES | 시작점 ID (패널/장비) |
| source_type | varchar(30) | YES | PANEL / EQUIPMENT / JUNCTION |
| destination_id | uuid | YES | 종료점 ID |
| destination_type | varchar(30) | YES | PANEL / EQUIPMENT / JUNCTION |
| cable_length | numeric(8) | YES | 케이블 길이 (m) |
| routing_path | jsonb | YES | 배선 경로 3D 좌표 |

### `equipment_motors` — 모터 정보 (8컬럼)

| 컬럼 | 타입 | NULL | 설명 |
|---|---|---|---|
| motor_id | uuid | NO | PK |
| equipment_id | uuid | NO | FK → equipment_details |
| motor_code | varchar(30) | NO | 모터 코드 |
| power_rating | numeric(10) | NO | 정격 전력 (kW) |
| voltage | numeric(10) | NO | 정격 전압 (V) |
| phase | smallint | NO | 상수 |
| efficiency | numeric(5) | YES | 효율 (%) |
| model_file_id | uuid | YES | FK → project_3d_model_files |

---

## 2. 기계 카탈로그 → 전기 입력 관련 컬럼

### `equipment_details` — 장비 상세 사양 (33컬럼 중 전기 관련)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| power_rating | numeric(8) | 정격 전력 (kW) |
| efficiency | numeric(5) | 효율 (%) |
| power_factor | numeric(4) | 역률 (%) |
| demand_factor | numeric(4) | 수용율 (%) |
| rated_voltage | numeric(8) | 정격전압 (V) |
| control_method | varchar(50) | 제어 방식 (DOL/STAR-DELTA/VFD) |
| actuation_type | varchar(30) | 구동 방식 (전기/공압/수동) |
| unit_price | numeric(12) | 단가 (원) |
| invoice_price | numeric(12) | 견적 단가 (원) |
| specifications | jsonb | 상세 사양 (JSON) |

### `equipment_mechanical` — 기계 설비 (전기 관련)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| power_rating | numeric(8) | 전기 소비량 (kW) |
| motor_id | uuid | FK → equipment_motors |
| motor_ids | jsonb | 복수 모터 ID 목록 |
| quantity | integer | 설치 수량 |
| standby_quantity | integer | 예비 수량 |

---

## 3. 내역서/수량산출 관련 테이블

별도 내역서 전용 테이블 없음. 아래 테이블에서 조합 생성:

| 테이블 | 역할 |
|---|---|
| `project_equipment_selections` | 프로젝트별 장비 선택 이력 — quantity, selection_type(MAIN/ALTERNATIVE/SPARE), used_parameters(JSON) |
| `project_structure_selections` | 구조물 선택 이력 — quantity, custom_dimensions, custom_parameters |
| `equipment_details` | 단가(unit_price), 견적단가(invoice_price) |
| `project_documentations` | 내역서 파일 관리 — document_type, file_uri, content |
| `structure_components` | 구조물-컴포넌트 수량 매핑 |

---

## 4. 테이블 간 연관관계 (FK 구조)

```
[projects]
  ├─(1:N)→ [equipment_details]              (project_id)
  ├─(1:N)→ [electrical_loads]               (project_id)
  ├─(1:N)→ [drawing_masters]                (project_id)
  ├─(1:N)→ [structures]                     (project_id)
  ├─(1:N)→ [project_equipment_selections]   (project_id)
  ├─(1:N)→ [project_structure_selections]   (project_id)
  ├─(1:N)→ [project_processes]              (project_id)
  └─(1:N)→ [project_documentations]         (project_id)

[equipment_details]
  ├─(1:1)→ [equipment_mechanical]           (equipment_id)
  ├─(1:N)→ [equipment_motors]               (equipment_id)
  ├─(1:1)→ [equipment_instrumentation]      (equipment_id)
  └─(1:N)→ [electrical_loads]               (equipment_id)

[electrical_loads]
  ├─→ [equipment_details]                   (equipment_id)
  ├─→ [electrical_system_panels]            (panel_id)
  └─→ [projects]                            (project_id)

[electrical_system_panels]
  └─→ [equipment_details] (ARRAY)           (connected_equipment_ids)

[equipment_mechanical]
  └─→ [equipment_motors]                    (motor_id / motor_ids jsonb)

[equipment_motors]
  ├─→ [equipment_details]                   (equipment_id)
  └─→ [project_3d_model_files]              (model_file_id)
```

---

## 5. 전기설계 자동화 데이터 흐름 (DB 기준)

```
[기계 카탈로그 등록]
equipment_details (power_rating, control_method, efficiency, power_factor, demand_factor, rated_voltage)
equipment_mechanical (quantity, standby_quantity, motor_id)
equipment_motors (power_rating, voltage, phase, efficiency)
    ↓
[전기 부하 계산 — 자동 생성]
electrical_loads (full_load_ampere, starting_method, operation_mode, duty_cycle)
    ↓
[MCC 그룹핑 — 자동 생성]
electrical_system_panels (panel_type=MCC, current_rating, bus_bar_rating, number_of_circuits, protection_scheme jsonb)
    ↓
[케이블 스케줄 — 자동 생성]
electrical_cables (cable_type, conductor_size, cable_length, routing_path jsonb)
    ↓
[수량산출 — 조합 생성]
project_equipment_selections (quantity, used_parameters jsonb)
    ↓
[내역서 — 파일 생성]
project_documentations (document_type=내역서, file_uri)
```

---

## 6. 설계상 갭 확인 결과

### 공백 #1 — `equipment_motors`에 `starting_method`, `power_factor` 없음 ✅ 확인됨

**결론: `equipment_details`를 경유해서 조인해야 한다.**

카탈로그의 기동방식(`s_ctrl_method`)과 역률(`s_pwr_factor_percent`)은 `equipment_details`의 `control_method`, `power_factor`로 매핑된다. `equipment_motors`는 `equipment_id`로 `equipment_details`와 연결되므로, 기동방식·역률이 필요한 계산 로직의 조인 경로는 다음과 같다.

```
equipment_motors
  → equipment_details (via equipment_id)
    → control_method   (기동방식: DOL/VFD/Soft/MOP)
    → power_factor     (역률: %)
    → efficiency       (효율: %)
    → demand_factor    (수용율: %)
```

`electrical_loads`는 이 값들이 설계에 실제 적용된 후 저장되는 테이블이다.  
모터 계산 단계에서 `electrical_loads`가 아직 생성되지 않은 경우에도 `equipment_details`에서 바로 조회 가능하다.

---

### 공백 #2 — 역률(power_factor) 우선순위 ✅ 확인됨

**결론: `electrical_loads.power_factor` 우선, 없으면 `equipment_details.power_factor` fallback.**

데이터 흐름상 카탈로그 값이 `equipment_details`에 먼저 등록되고, 설계 적용 단계에서 `electrical_loads`에 복사·수정된다.

| 단계 | 테이블 | 값의 성격 |
|---|---|---|
| 카탈로그 등록 | `equipment_details.power_factor` | 제조사 스펙 기준값 (기본값) |
| 설계 적용 | `electrical_loads.power_factor` | 실제 설계에 사용되는 값 (사용자 수정 가능) |

적용 규칙:
```
역률 = electrical_loads.power_factor (NOT NULL인 경우)
     → NULL이면 equipment_details.power_factor 사용
     → 둘 다 NULL이면 기본값 0.85 적용 (KEC 기준)
```

효율(`efficiency`)도 동일한 우선순위 규칙 적용.

추가 주의사항: 카탈로그 효율값이 `0.865` 형태와 `86.5` 형태로 혼재할 수 있으므로, 계산 전에 `> 1`이면 `÷ 100` 정규화 필요.

---

### 공백 #3 — 전압강하 저장 위치 ✅ 확정 (미구현)

**결론: 전압강하는 현재 GWD 프로그램 범위에 포함되지 않는 항목. 구현 없음.**

케이블 선정은 상용전류 기준 `(참조) CV 및 GV` 참조 테이블 구간 매칭으로만 이루어진다.  
전압강하 계산·검증·저장은 현재 버전에서 다루지 않으며 `electrical_cables` 테이블에 관련 컬럼 불필요.

TDD 기술 방향: 향후 고려사항(섹션 7)에 미구현 항목으로 명시.

---

### 공백 #4 — MCC ↔ 케이블 조회 패턴 ✅ 방향 확인됨

**결론: 케이블은 장비(모터) → MCC 방향으로 연결되므로 `destination` 기준 단방향 조회가 기본 패턴.**

전기계산서 흐름상 케이블 스케줄은 각 부하(모터)에서 MCC 패널 방향으로 생성된다.

```
electrical_cables:
  source_id   = equipment_id (모터/부하)       source_type   = 'EQUIPMENT'
  destination_id = panel_id (MCC)             destination_type = 'PANEL'
```

MCC에 연결된 케이블 전체 조회 패턴:
```sql
SELECT * FROM electrical_cables
WHERE destination_id = :mcc_panel_id
  AND destination_type = 'PANEL'
```

단선결선도 자동 생성 시 이 쿼리로 MCC별 회로 목록을 가져온다.  
MCC → 배전반 방향 케이블(주간선)은 반대로 `source_id = :mcc_panel_id AND source_type = 'PANEL'`로 조회.

---

### 공백 #5 — `used_parameters` jsonb 구조 ⚠️ 부분 확인

**결론: 수량산출에 사용되는 핵심 파라미터 키명 확인됨. 전체 구조는 이안 확인 필요.**

`electrical_quantity_estimate_analysis.md` 및 `260401_전기 수량 산출_r3.xlsx` 분석으로 확인된 파라미터:

```json
{
  "conduit_length_m": 10.5,        // 전선관 길이 (m)
  "conduit_power":    "22C",        // 동력 전선관 규격
  "conduit_control":  "16C",        // 제어 전선관 규격
  "mcc_no":           "MCC1",       // MCC 번호
  "mcc_panel_count":  2,            // MCC 패널 수
  "cable_cv":         "CV 6mm²",    // 동력 케이블 규격
  "cable_gv":         "GV 6mm²",    // 접지 케이블 규격
  "s_ctrl_method":    "S_SYS02"     // 기동방식 코드
}
```

**미확인 항목**: 소요용량 / 적용용량 / 단위 필드명, 계측기 파라미터 구조  
**→ 260114 서준호 첨부파일 또는 이안 개발팀 확인 필요**

---

### 공백 확인 요약

| # | 공백 | 상태 | 조치 |
|---|---|---|---|
| 1 | 기동방식 조인 경로 | ✅ 확인 | equipment_details 경유 명시 |
| 2 | 역률 우선순위 | ✅ 확인 | electrical_loads 우선, fallback 0.85 |
| 3 | 전압강하 저장 위치 | ✅ 확정 | 미구현 항목 — TDD 섹션 7(향후 고려사항)에 명시 |
| 4 | MCC-케이블 조회 패턴 | ✅ 확인 | destination 기준 단방향 조회 |
| 5 | used_parameters jsonb 구조 | ⚠️ 부분 | 핵심 키명 확인, 전체 구조 이안 확인 필요 |
