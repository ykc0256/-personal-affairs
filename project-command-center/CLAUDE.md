# Project Command Center — 운영 규칙

여러 프로젝트를 통합 관리하는 레포입니다. 이 파일은 Claude Code가 작업 시 따라야 할 규칙을 정의합니다.

---

## MCP 자동 연결

이 레포를 열면 PostgreSQL DB와 MinIO 스토리지가 자동 연결됩니다.

| 서버 | 대상 | 계정 | 권한 |
|---|---|---|---|
| `postgres` | 172.16.0.20:5432 / bkt_wai_design | postgres_read | SELECT 전용 |
| `minio` | 172.16.0.20:9000 | waiuser | 읽기 전용 |

- 조회 방법 및 쿼리 패턴: `99_reference/mcp-query-guide.md`
- 전체 아키텍처 및 버킷 현황: `99_reference/mcp-architecture.md`
- 연결 안 될 때: 사내망(172.16.0.20) 접속 가능 여부 먼저 확인

---

## 폴더 구조

| 폴더 | 역할 |
|---|---|
| `00_inbox/` | 미분류 메모, 갑자기 들어온 요청, 아직 분류 안 된 자료 |
| `01_calendar/` | 전체 일정, 마일스톤, 마감 관리 |
| `02_projects/` | 프로젝트별 실행 문서 |
| `03_weekly-reviews/` | 주간 리뷰 및 다음 주 계획 (파일명: `YYYY-Www.md`) |
| `04_templates/` | 반복 작성용 템플릿 — 복사 후 사용, 원본 수정 금지 |
| `05_archive/` | 완료·보류·중단 프로젝트 (`02_projects/`에서 이동) |
| `99_reference/` | 공통 참고자료, MCP 설정, 기준 문서 |

---

## 프로젝트 폴더 내부 구조

```
02_projects/{프로젝트명}/
├── {프로젝트명}-overview.md     ← 진행 상황, 일정, 참고 파일 목록 (인수인계 문서)
├── {프로젝트명}-task-list.md    ← 할 일 체크리스트
├── meeting-minutes/             ← 회의록 (파일명: YYYY-MM-DD-{회의명}.md)
└── (기타 산출물, 메모, 하위 폴더)
```

---

## 상황별 업데이트 규칙

### 새 프로젝트 추가 시
1. `04_templates/project-template.md` 복사 → `02_projects/{프로젝트명}/`
2. `01_calendar/master-schedule.md`에 주요 마감·검토일 등록

### 회의록 추가 시
1. `04_templates/meeting-note-template.md` 복사 → `02_projects/{프로젝트명}/meeting-minutes/YYYY-MM-DD-{회의명}.md`
2. 해당 프로젝트의 `{프로젝트명}-overview.md` "바로 확인할 문서" 항목에 링크 추가

### 프로젝트 진행 상황 업데이트 시
- 해당 프로젝트의 `{프로젝트명}-overview.md` 수정 (일정, 상태, 결정사항 반영)

### 주간 리뷰 작성 시
- `04_templates/weekly-review-template.md` 복사 → `03_weekly-reviews/YYYY-Www.md`

### 프로젝트 완료·보류·중단 시
- `02_projects/{프로젝트명}/` 폴더 전체를 `05_archive/`로 이동

### 99_reference 업데이트 시
- 새 MCP 서버 추가 → `99_reference/README.md`의 폴더 구조 표 업데이트
- 기존 참고자료 추가 → 해당 하위 폴더에 파일 추가, `00_overview.md` 있으면 링크 추가

---

## 자료 연계 규칙 (내부 링크 작성법)

**같은 폴더 내 참조** — 파일명만 사용:
```
homepage-renewal-task-list.md
meeting-minutes/2026-05-12-회의명.md
```

**`02_projects/{프로젝트명}/`에서 `99_reference/` 참조**:
```
../../99_reference/company-homepage/homepage-renewal-scenario.md
../../99_reference/electrical-design/00_overview.md
```

**`99_reference/` 내 파일에서 `02_projects/` 참조**:
```
../../02_projects/electrical-design-automation/notes/파일명.md
../../02_projects/electrical-design-automation/deliverables/경로/
```

**같은 `99_reference/` 폴더 내 참조**:
```
korean_electrical_design_reference_map.md
```

> 절대경로 사용 금지. 외부 레포·외부 서버 참조 시에만 절대경로 명시.

---

## 프로젝트 상태 기준

| 상태 | 의미 |
|---|---|
| 예정 | 아직 착수 전 |
| 진행 | 현재 작업 중 |
| 대기 | 외부 답변·승인·자료 수신 대기 |
| 위험 | 일정 지연 가능성 높음 |
| 완료 | 산출물 제출 또는 내부 완료 |
| 보류 | 일정 미정 또는 우선순위 하락 |
