# 전기설계 자동화 자료 정리 목록

전기설계 자동화 관련 분석 문서, 설명자료, 원본 소스 파일을 한 번에 보기 위한 목차입니다.

---

## 0. 원본 소스 파일

### `01_sources/` 폴더 구조

| 폴더 | 파일 | 설명 |
|------|------|------|
| `매뉴얼/` | `260414_WAI Design_튜토리얼 매뉴얼_1.0.1.pdf` | WAI Design 튜토리얼 공식 배포 PDF |
| `매뉴얼/` | `260413_WAI Design_튜토리얼 매뉴얼_1.0.1.docx` | WAI Design 튜토리얼 편집 원본 DOCX |
| `기능정의서/` | `250721_기능정의서.xlsx` | 전기설계 자동화 기능 정의 (요구사항 원천) |
| `계산서_수량산출/` | `260106_전기계산서(최종샘플).xlsx` | 전기계산서 최종 샘플 (시트 구조 분석용) |
| `계산서_수량산출/` | `260401_전기 수량 산출_r3.xlsx` | 전기 수량산출 기준 시트 (r3) |
| `카탈로그/` | `카탈로그_기계_v1.5.0.xlsx` | 기계 카탈로그 — 동력/기동방식 원천 |
| `카탈로그/` | `카탈로그_전기_v1.3.0.xlsx` | 전기 카탈로그 — 자재 단가 원천 |
| `카탈로그/` | `카탈로그_계측기_v.1.3.0.xlsx` | 계측기 카탈로그 — 계측 자재 단가 원천 |
| `내역서_양식/` | `내역서(양식)_국문(Metric)_r11.xlsx` | 내역서 표준 양식 (r11) |

---

## 1. 보고서형 설명자료

### 전기설계 자동화 구조 및 레퍼런스 보고서

- 위치: [`../../02_projects/electrical-design-automation/deliverables/electrical_design_reference_report/`](../../02_projects/electrical-design-automation/deliverables/electrical_design_reference_report/)
- HTML 보고서: `전기설계_자동화_구조_및_레퍼런스_보고서_v0.1.html`
- Markdown 원본: `전기설계_자동화_구조_및_레퍼런스_보고서_v0.1.md`
- 이미지 자산: [`../../02_projects/electrical-design-automation/deliverables/electrical_design_reference_report/assets/`](../../02_projects/electrical-design-automation/deliverables/electrical_design_reference_report/assets/)
- 내용:
  - 공정 설계와 기계 카탈로그에서 전기설계 입력값이 만들어지는 구조
  - 전기계산서, 도면, 수량산출서, 내역서로 이어지는 성과품 흐름
  - KEC, KS C IEC, 카탈로그 DB 등 항목별 참고 레퍼런스
  - 보고자료에 바로 넣을 수 있는 구조도 PNG 6장

## 2. 기존 설명자료

### 전기설계 자동화 흐름 설명자료

- 위치: [`../../02_projects/electrical-design-automation/deliverables/electrical_design_explainer/`](../../02_projects/electrical-design-automation/deliverables/electrical_design_explainer/)
- 형식: PPTX, PNG, 목차 Markdown
- 내용:
  - 전체 전기설계 자동화 흐름
  - 입력 데이터와 기준정보
  - 부하계산, 전선/차단기, MCC/IO, 케이블/Tray 산출
  - 용량계산서, 도면, 수량산출서, 내역서 성과품 흐름

## 3. 분석 문서

### 전기계산서 샘플 분석

- 파일: [`../../02_projects/electrical-design-automation/notes/260106_calculation_workbook_analysis.md`](../../02_projects/electrical-design-automation/notes/260106_calculation_workbook_analysis.md)
- 원본: `260106_전기계산서(최종샘플).xlsx`
- 내용:
  - Excel 시트 구조 분석
  - 초기 데이터, 동력설비 부하계산서, 부하일람표, 동력설비 리스트, IO/케이블 포설준공 흐름
  - 참조 시트와 계산서 역할 정리

### 전기설계 자동화 요구사항 분석

- 파일: [`../../02_projects/electrical-design-automation/notes/electrical_design_requirements_analysis.md`](../../02_projects/electrical-design-automation/notes/electrical_design_requirements_analysis.md)
- 원본:
  - `250721_기능정의서.xlsx`
  - `260106_전기계산서(최종샘플).xlsx`
  - `260414_WAI Design_튜토리얼 매뉴얼_1.0.1.pdf`
- 내용:
  - 기능정의서 기준 전기설계 범위
  - 계산, 3D 연계, 2D 도면, 물량/내역 요구사항
  - 자동화 프로그램 모듈 제안

### 기계 카탈로그 기반 전기설계 입력 구조 분석

- 파일: [`../../02_projects/electrical-design-automation/notes/mechanical_catalog_electrical_input_analysis.md`](../../02_projects/electrical-design-automation/notes/mechanical_catalog_electrical_input_analysis.md)
- 원본: `카탈로그_기계_v1.5.0.xlsx`
- 내용:
  - 공정 설계와 기계 카탈로그 선택 결과가 전기설계 입력값으로 전달되는 구조
  - 장비별 동력, 기동방식, 정격전압, 효율, 극수, 허용률 컬럼 분석
  - 기동방식 코드 `S_SYS01`~`S_SYS04` 매핑

### WAI Design 튜토리얼 전기설계 메모

- 파일: [`../../02_projects/electrical-design-automation/notes/wai_design_tutorial_electrical_notes.md`](../../02_projects/electrical-design-automation/notes/wai_design_tutorial_electrical_notes.md)
- 원본: `260414_WAI Design_튜토리얼 매뉴얼_1.0.1.pdf`
- 내용:
  - 전기설계 관련 사용자 흐름
  - 3D MCC/Tray 배치, Excel 다운로드/Parsing, SVG/PDF/DXF 출력 흐름

### 전기 수량산출 및 내역서 생성 흐름 분석

- 파일: [`../../02_projects/electrical-design-automation/notes/electrical_quantity_estimate_analysis.md`](../../02_projects/electrical-design-automation/notes/electrical_quantity_estimate_analysis.md)
- 원본:
  - `260401_전기 수량 산출_r3.xlsx`
  - `내역서(양식)_국문(Metric)_r11.xlsx`
  - `카탈로그_전기_v1.3.0.xlsx`
  - `카탈로그_계측기_v.1.3.0.xlsx`
- 내용:
  - 전선, 전선관, Tray, LOP, MCC, 계측기 수량산출 구조
  - 수량산출서와 내역서 양식 연결
  - 전기/계측 카탈로그 DB를 이용한 단가 매칭 구조

### Outlook 이메일 전기설계 로그

- 파일: [`../../02_projects/electrical-design-automation/notes/outlook_mail_electrical_log.md`](../../02_projects/electrical-design-automation/notes/outlook_mail_electrical_log.md)
- 내용:
  - 전체 이메일 637건 중 전기설계 관련 88건 분류
  - 카테고리: 전기 내역서 개발(IAAN), 케이블트레이/전선관(3D), 전기설계 기준자료, 진성 용역, WAI Design 납품
  - 확인 필요 항목 7건 (액션 아이템 포함)

---

## 4. 기준 레퍼런스 정리

### 국내 전기설계 기준 레퍼런스 맵

- 파일: [`korean_electrical_design_reference_map.md`](korean_electrical_design_reference_map.md)
- 내용:
  - 전기설비기술기준, KEC, KS C IEC 계열 기준
  - 전선, 접지, 차단기, 배선설비, 케이블트레이 등 항목별 참고 기준
  - 전기계산서 참조표를 설명자료로 보강하기 위한 기준 출처
