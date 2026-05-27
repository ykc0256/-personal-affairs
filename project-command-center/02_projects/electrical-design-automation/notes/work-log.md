# Work Log

## 2026-05-18

### TDD 작성 사전 조사 — DB 조회 및 JSON 구조 분석

**목적**: 내역서(수량산출) TDD 작성 블로커인 `used_parameters` 구조 확인

#### DB 조회 결과
- `project_equipment_selections.used_parameters` — 전체 1,087행 모두 JSON null. 미구현 상태로 확인.
- `jsonb_schemas` — `used_parameters` 스키마 정의 없음.
- `elec_selection_rules` — 전기 선정 참조표 10종 데이터 존재 확인 (breaker, cable, conduit, eocr, mc, inverter, soft_starter, mcc_size, capacitor, cable_diameter).
- `equipment_catalog.output_values` (전기류) — 단가 정보만 존재.

#### JSON 파일 분석 (report.json / project.json)
- 전기 계산 파라미터는 DB가 아닌 **프로젝트 저장 시 생성되는 JSON 파일**에 존재함을 확인.
- `report.json equipments[]` 내 장비별 전기 필드 확인: `power_kW`, `operation_time`, `ctrl_method`, `rated_volt_V`, `efficiency_percent`, `pwr_factor_percent`, `demand_factor_percent`.
- `project.json mcc_details[]` — MCC별 장비 구성, `mcc_equip_no`, `mcc_size_mm` 확인.
- `report.json tray_quantity` — 케이블트레이 단일 객체 (규격, 수량) 확인.

#### 발견된 미확인 항목
- 전선/전선관 계산 결과 키 — JSON 내 미발견 (소스코드 입수 후 보완 필요).
- 계측기(I_*) 데이터 — report.json equipments에 없음.
- 케이블 스케줄 데이터 — 두 파일 모두 없음.
- `operation_time` 중복 — `values[]`와 `equipments[]` 두 곳에 존재하며 값 상이.
- 비동력 장비 (`ctrl_method: null`, `power_kW: 0`) 처리 기준 불명.

#### TDD 작성 전략 확정
- **지금 작성 가능**: 동력장비 전기 계산 로직(3섹션), MCC 구성, 케이블트레이 수량.
- **소스코드 입수 후 보완**: 전선/전선관/케이블 스케줄, 계측기 흐름.
- **이안 질의 병행**: `used_parameters` 구조, 케이블트레이 3D 연동 방식.
- 미확인 항목은 ⚠️ 표시 후 추후 보완 방식으로 5/22 마감 대응.

---

## 2026-05-12

- 전기설계 성과품 자료 정리용 로컬 레포를 생성했다.
- 원본, 작업본, 최종본, 템플릿, 메모 폴더를 분리했다.

