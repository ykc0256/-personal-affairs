# 전기설계 자동화 TDD 작성

## 프로젝트 개요

| 항목 | 내용 |
| --- | --- |
| 목적 | WAI Design 전기설계 자동화 프로그램의 Technical Design Document(TDD)를 작성한다 |
| 담당 범위 | 전기설계 파이프라인 전 구간 — 입력 데이터 모델, 계산 엔진, 기준정보 DB, 수량산출, 내역서, 도면 산출 모듈 |
| 현재 상태 | 진행 |
| 우선순위 | 높음 |
| 기준일 | 2026-05-18 |
| 참고 레포 | `C:\Users\USER\desktop\electrical-design-deliverables` |
| 진행 로그 | `02_projects/electrical-design-automation/electrical-design-automation-progress.md` |

## 배경

WAI Design은 수처리 플랜트 전기설계 자동화 프로그램이다. 공정 설계와 기계 카탈로그 선택 결과를 전기설계 입력값으로 받아, 용량계산서·부하일람표·케이블 스케줄·IO 리스트·수량산출·내역서·도면까지 연결하는 설계 파이프라인으로 정의된다.

`electrical-design-deliverables` 레포에 전기계산서 샘플 분석, 요구사항 분석, 기계 카탈로그 입력 구조 분석, 수량산출 흐름 분석, 국내 전기설계 기준 맵이 정리되어 있다. 이 자료를 바탕으로 프로그램 구현을 위한 TDD를 작성한다.

## 목표

1. 전기설계 자동화 파이프라인 전 구간의 입력/처리/출력을 TDD로 명세한다.
2. 각 모듈의 책임과 인터페이스를 정의한다.
3. 기준정보 DB 구조와 관리 방식을 정의한다.
4. 현재 파악된 Gap과 미결 사항을 명시하고 해결 우선순위를 정한다.

## 설계 파이프라인 개요

```
공정 설계
  → 공정별 필요 장비 산출
  → 기계 카탈로그에서 장비 모델 선택
    (동력 / 기동방식 / 정격전압 / 효율 / 역률 / 수용율)
  → 전기 기기 리스트 자동 생성
  → 전기 계산 수행
  → 성과품 생성 (계산서 / 도면 / 수량산출 / 내역서)
```

## 모듈 구조

### 계산 모듈

| 모듈 | 역할 |
| --- | --- |
| Input Registry | 공정 설계 결과, 기계 카탈로그 선택, 기기 리스트, 계측기 리스트, 프로젝트 설정값 관리 |
| Reference Data | CV/GV, 차단기, 전선관, MC/EOCR/인버터 등 기준정보 DB 관리 |
| Calculation Engine | 부하용량, 정격전류, 상용전류, MCC 집계, IO 산출, 케이블 스케줄, Tray 규격 계산 |
| Drawing Data Generator | 단선결선도, MCC 구성도, 부하일람표, 케이블 스케줄, 전기 평면도 중간 데이터 생성 |
| Export / Import | Excel, PDF, DXF, SVG 출력 및 Excel 파싱 입력 |

### 수량·내역 모듈

| 모듈 | 역할 |
| --- | --- |
| electrical_quantity_engine | 전선, 전선관, Tray, LOP, MCC, 계측기 수량 집계 |
| catalog_lookup | 전기·계측기 카탈로그의 equipment_code 기반 품명·규격·단가 조회 |
| estimate_mapper | 수량산출 결과를 내역서 양식(기자재/설치비/일위대가) 행 구조로 매핑 |
| unit_price_engine | 일위대가목록과 일위대가 세부 산식 관리 |
| estimate_exporter | 국문 Metric 내역서 Excel 생성 |

## 핵심 계산 공식

| 항목 | 공식 |
| --- | --- |
| 부하용량 (kVA) | `동력(kW) / (효율 × 역률)` (반올림) |
| 정격전류 (A) | `동력(kW) × 1000 / 1.732 / 380 / 효율 / 역률` |
| 상용전류 (A) | `정격전류 × 상용수량` |
| MCC 대표 전류 | `구간 합계 + 최대 부하 × 10%` |
| IO 집계 | `(MCC IO + 계측제어 IO) × 1.2` (20% 여유) |

## 산출물 정의

### 계산서류

- 전기 용량계산서
- 부하일람표
- 동력설비 리스트
- 계측기 리스트
- IO 리스트 및 IO 집계표
- 케이블 스케줄표 (동력 / 제어 / 계측)
- 전선관 산출
- Tray 계산 산출서

### 도면류

- 부하일람표 도면
- 수변전설비 단선결선도
- MCC 단선결선도
- MCC 구성도
- 전기 평면도
- 케이블 스케줄 도면
- Tray 관련 도면

### 물량·원가

- 고압반 / 저압반 / MCC 물량
- 전기 Tray 물량
- 동력 / 제어 / 계측 케이블 물량
- 전기 내역서 (기자재 / 설치비 / 일위대가)

### Exchange 포맷

- Excel, PDF, DXF, SVG

## 기준정보 DB 설계

참조표별 기준 근거는 `99_reference/electrical-design/korean_electrical_design_reference_map.md`에 정리한다.

공통 필드:

| 필드 | 설명 |
| --- | --- |
| `rule_id` | 기준정보 고유 ID |
| `rule_group` | 전선, 차단기, 전선관, PLC 전선 등 그룹 |
| `standard_source` | KEC, KS, 제조사 카탈로그, 사내 기준 등 |
| `source_version` | 기준 버전 또는 발행일 |
| `effective_from` / `effective_to` | 적용 기간 |
| `input_condition` | 적용 조건 |
| `output_value` | 선정 결과 |
| `review_status` | 초안 / 검토중 / 승인 / 폐기 |

## 참고자료 목차

| No. | 자료 | 위치 |
| --- | --- | --- |
| 1 | 전기설계 자동화 요구사항 분석 | `electrical-design-deliverables/05_notes/electrical_design_requirements_analysis.md` |
| 2 | 전기계산서 샘플 분석 | `electrical-design-deliverables/05_notes/260106_calculation_workbook_analysis.md` |
| 3 | 기계 카탈로그 전기입력 구조 분석 | `electrical-design-deliverables/05_notes/mechanical_catalog_electrical_input_analysis.md` |
| 4 | 전기 수량산출 및 내역서 흐름 분석 | `electrical-design-deliverables/05_notes/electrical_quantity_estimate_analysis.md` |
| 5 | 국내 전기설계 기준 Reference Map | `electrical-design-deliverables/06_references/korean_electrical_design_reference_map.md` |
| 6 | 산출물 목록 | `electrical-design-deliverables/04_templates/electrical-automation-deliverables.md` |

## Gap 및 미결 사항

| 항목 | 내용 | 우선순위 |
| --- | --- | --- |
| 단선결선도/MCC 구성도 도면 데이터 구조 | 계산서 샘플에 도면 자체는 없고 생성용 데이터만 존재 | 높음 |
| 전기설계 UI 입력값 정의 | 매뉴얼에 일부 보이나 계산서에는 초안 수준 | 높음 |
| Excel Parsing 스키마 | 매뉴얼에 기능 흐름만 있고 입력 Excel 스키마 미정 | 중간 |
| 국가별 기준정보 관리자 테이블 구조 | 기능정의서 요구사항이나 구체적 설계 없음 | 중간 |
| Tray 경로 설정 및 간섭 체크 로직 | 기능정의서·매뉴얼에 존재하지만 계산서 샘플과 Gap 있음 | 중간 |
| 효율·역률 값 정규화 기준 | 카탈로그에 0.865와 86.5 혼재 | 낮음 |
| 펌프 등 범위형 동력 대표값 선정 기준 | 최소/최대 동력 중 어떤 값 사용할지 미정 | 낮음 |

## 일정 계획

| 마일스톤 | 목표일 | 상태 | 비고 |
| --- | --- | --- | --- |
| 기존 분석 자료 정리 및 레포 구성 | 2026-05-18 | 완료 | electrical-design-deliverables 레포 기준 |
| TDD 초안 작성 (파이프라인·모듈·계산 공식) | 미정 | 예정 | |
| 기준정보 DB 구조 초안 작성 | 미정 | 예정 | |
| 도면 모듈 데이터 구조 정의 | 미정 | 예정 | Gap 해소 필요 |
| 수량산출·내역서 모듈 TDD 작성 | 미정 | 예정 | |
| TDD 전체 초안 완성 | 미정 | 예정 | |
| 내부 검토 및 확정 | 미정 | 예정 | |

## 리스크 / 블로커

| 항목 | 영향 | 대응 |
| --- | --- | --- |
| 도면 데이터 구조 미정의 | Drawing Data Generator 모듈 설계 불가 | 튜토리얼 매뉴얼 및 SVG/DXF 출력 흐름 추가 분석 필요 |
| UI 입력값 정의 부족 | Input Registry 설계 불완전 | WAI Design 매뉴얼 재분석 또는 실제 UI 확인 필요 |
| 기능정의서 요구사항 일부 미반영 | TDD와 요구사항 간 Gap 발생 | 기능정의서(`250721_기능정의서.xlsx`) 재검토 필요 |

## 다음 행동

1. TDD 문서 구조를 확정하고 섹션별 작성 순서를 정한다.
2. Gap 항목 중 도면 데이터 구조와 UI 입력값 정의를 우선 해소한다.
3. 기준정보 DB 설계 초안을 `06_references/korean_electrical_design_reference_map.md` 기반으로 작성한다.
