# Reference

공통 참고자료, 규칙, 링크를 보관합니다.

---

## 폴더 구조

| 폴더 | 내용 |
|---|---|
| `electrical-design/` | GWD 전기설계 자동화 관련 참고자료 (카탈로그, 계산서, DB 설계서 등) |
| `db-mcp/` | PostgreSQL DB MCP 연결 설정 및 가이드 |
| `minio-mcp/` | MinIO 스토리지 MCP 연결 서버 (Python, 읽기 전용) |
| `wai-admin-manual/` | WAI Design Admin 관리자 가이드 v2026.0.0 (원본 PDF + MD 요약) |

---

## MCP 연결 개요

전체 MCP 구조 및 연결 방식: [`mcp-guide.md`](mcp-guide.md)  
DB ↔ MinIO 아키텍처: [`mcp-architecture.md`](mcp-architecture.md)  
DB + MinIO 조회 규칙 가이드: [`mcp-query-guide.md`](mcp-query-guide.md)

---

## DB 직접 조회 (PostgreSQL MCP)

```
DB    : 172.16.0.20:5432 / postgres
Schema: bkt_wai_design
계정  : postgres_read (SELECT 전용 — 수정/삭제 불가)
```

연결 설정 파일: `C:\Users\USER\desktop\wai-mcp\.mcp.json` (로컬, git 제외)  
상세 가이드: [`db-mcp/docs/step3_claude_mcp.md`](db-mcp/docs/step3_claude_mcp.md)

### 연결 안 될 때 체크

| 증상 | 확인 사항 |
|---|---|
| 테이블 조회 안 됨 | 사내망(172.16.0.20) 접속 가능한 환경인지 확인 |
| MCP 서버 오류 | `node --version` → v18 이상 필요 |
| Claude Code 재시작 | `.mcp.json` 수정 후 반드시 재시작 필요 |

---

## MinIO 직접 조회 (MinIO MCP)

```
엔드포인트: 172.16.0.20:9000
계정      : waiuser (wai-readonly 정책 — 조회/읽기 전용)
버킷 수   : 18개
```

MCP 서버 코드: [`minio-mcp/`](minio-mcp/)  
연결 설정: `C:\Users\USER\desktop\wai-mcp\.mcp.json`의 `minio` 항목

### 주요 버킷

| 버킷 | 용도 |
|---|---|
| `wai-equipment-files` | 장비 3D 모델, Revit 패밀리 (1,800건) |
| `wai-equipment-catalog` | 제품 카탈로그 PDF (664건) |
| `wai-drawing-files` | 도면 파일 (1,100건) |
| `wai-project-docs` | 프로젝트 문서 (834건) |

---

## 예시 질문 (MCP 연결 후)

```
bkt_wai_design 스키마에 어떤 테이블이 있어?
equipment_catalog에서 펌프 종류 목록 보여줘
wai-equipment-files 버킷 파일 목록 보여줘
project_equipment_selections에서 used_parameters 샘플 10개 보여줘
```
