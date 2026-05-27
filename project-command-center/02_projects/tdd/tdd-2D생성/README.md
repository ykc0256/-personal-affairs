# 2D 생성 TDD 작업 폴더

P&ID / PFD 2D 도면 생성 규칙 TDD 작업 폴더입니다.

## 문서 목록

| 파일 | 상태 | 설명 |
|---|---|---|
| `TDD_2D생성_v0.1.md` | 초안 | 2D 생성 규칙 (P&ID/PFD 데이터 연결 구조 위주, SVG 생성 로직 미입수) |

## 범위

- P&ID 도면 생성 규칙 (공정 선택 → pid.json → SVG)
- PFD 도면 생성 규칙
- process_pid_components / process_pid_excel_relations DB 구조
- pid.json 구조 및 계측기 연결 흐름

## 현재 상태

- 데이터 연결 구조(DB 테이블, pid.json 키) 정리 완료
- SVG 생성 로직 자료 미입수 — 개발 담당자(이안) 확인 필요
- MCC 외형도, 단선결선도 생성 규칙 미작성

## 남은 작업

1. SVG 생성 엔진 및 템플릿 위치 확인 (이안 / 소스코드)
2. DataIn 변수 (`{info1_size}`, `{info1_bm}` 등) 실제 값 주입 경로 확인
3. 공정 번호(no_process) 자동 부여 규칙 확인
4. MCC 구성도, 단선결선도 생성 규칙 추가 작성
5. drawing_files ↔ projects 연결 테이블 구조 DB 스키마 확인
