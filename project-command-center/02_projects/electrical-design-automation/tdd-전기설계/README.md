# TDD — 전기설계 파트

TDD 전기설계 섹션 작업을 위한 참고 자료 모음입니다.
`notes/` 파일들은 `02_projects/electrical-design-automation/notes/`의 복사본입니다.

## 커버 범위 (Notion 기준)

- ⚡ 초기 데이터 구조 (기계 카탈로그 → 전기 입력)
- 🔢 전기 계산서 생성 (부하계산, 전선/차단기, MCC, IO, 케이블 스케줄)
- 📐 전기 도면 생성 (SVG → PDF/DXF)
- 🏗️ 3D 레이아웃 — 전기 트레이 (MCC 배치, Tray 배치, 전선 연결)

## 참고 파일 목록

| 파일 | 내용 |
| --- | --- |
| `notes/mechanical_catalog_electrical_input_analysis.md` | 기계 카탈로그 컬럼 구조, 기동방식 코드, 전기설계 입력값 흐름 |
| `notes/electrical_design_requirements_analysis.md` | 기능정의서·계산서 샘플·튜토리얼 기반 전기설계 요구사항 전체 |
| `notes/260106_calculation_workbook_analysis.md` | 전기계산서 Excel 31개 시트 구조, 계산 공식, 참조 테이블 |
| `notes/wai_design_tutorial_electrical_notes.md` | WAI Design 전기설계 사용 흐름 (탭 순서, 설정 팝업, 도면 내보내기) |
| `notes/WAI_전기설계_Notion_정리.md` | Notion 전기설계 페이지 정리 내용 |
| `notes/2026-05-14_Notion_전기설계_업데이트.md` | Notion 업데이트 작업 내역 |
| `notes/Notion_수정사항_작업지시서.md` | 전기계산서·도면·3D layout Notion 수정 지시 내용 |

## 원본 파일 (99_reference)

| 파일 | 용도 |
| --- | --- |
| `260106_전기계산서(최종샘플).xlsx` | 계산서 구조·공식 원천 |
| `250721_기능정의서.xlsx` | 전기설계 기능 요구사항 원천 |
| `카탈로그_기계_v1.5.0.xlsx` | 동력·기동방식 입력값 원천 |
| `260414_WAI Design_튜토리얼 매뉴얼_1.0.1.pdf` | 사용 흐름 원천 |
| `8.(중간보고_제출용) bkt_WAI_Design 3.3.2차 테이블 목록 및 테이블 상세 설계서 혼합본.xlsx` | DB 스키마 원천 |
