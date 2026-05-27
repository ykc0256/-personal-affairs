# WAI MCP — 시스템 연결 구조

> 마지막 검증: 2026-05-18

---

## 전체 구조

```
┌─────────────────────────────────────────────────────┐
│                   Claude Code                        │
│               (대화창 / 자연어 질의)                  │
└────────────────────┬────────────────────────────────┘
                     │ MCP (Model Context Protocol)
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
  ┌───────────────┐    ┌─────────────────────────────┐
  │ minio_server  │    │  @modelcontextprotocol/      │
  │   .py         │    │   server-postgres (npx)      │
  │  (Python)     │    │  (Node.js)                   │
  └───────┬───────┘    └──────────────┬──────────────┘
          │                           │
          ▼                           ▼
  ┌───────────────┐    ┌─────────────────────────────┐
  │  MinIO        │    │  PostgreSQL                  │
  │  172.16.0.20  │    │  172.16.0.20:5432            │
  │  :9000        │    │  DB: postgres                │
  │  waiuser      │    │  Schema: bkt_wai_design      │
  │  (읽기 전용)  │    │  User: postgres_read (읽기전용)│
  └───────────────┘    └─────────────────────────────┘
```

---

## DB ↔ MinIO 연결 방식

두 시스템은 **`minio_file_uploads` 테이블**을 통해 연결됩니다.

```
minio_file_uploads
├── id              (UUID)         — 레코드 고유 ID
├── table_name      (text)         — 연결된 DB 테이블명
├── record_id       (UUID)         — 해당 테이블의 레코드 ID
├── bucket_name     (text)         — MinIO 버킷명
├── file_path       (text)         — 버킷 내 파일 경로
├── original_filename              — 원본 파일명
├── file_size, mime_type           — 파일 메타데이터
├── upload_status   (completed)    — 업로드 상태
└── uploaded_at     (timestamp)    — 업로드 일시
```

### 조회 흐름 예시

```
[DB] drawing_files 테이블
  └─ id: 019e1feb-8c6b-...
        │
        ▼
[DB] minio_file_uploads
  └─ record_id: 019e1feb-8c6b-...
     bucket_name: wai-drawing-files
     file_path:   019e1feb-8c6b-.../파일명.xlsx
        │
        ▼
[MinIO] wai-drawing-files 버킷
  └─ 019e1feb-8c6b-.../파일명.xlsx  ← 실제 파일
```

---

## 연결성 검증 결과 (2026-05-18 기준)

### 전체 현황

| 항목 | 값 |
|---|---|
| DB 등록 파일 수 | 7,002건 |
| 업로드 상태 | 전부 `completed` |
| MinIO 총 버킷 수 | 18개 |
| DB 연결 버킷 수 | 15개 |
| 실존 파일 검증 (샘플) | 14/15 OK |

### 버킷별 파일 현황

| MinIO 버킷 | DB 테이블 | 등록 건수 | 연결 상태 |
|---|---|---|---|
| wai-drawing-files | drawing_files | 1,069건 | ⚠️ 버킷명 오타 |
| wai-equipment-files | equipment_files | 1,709건 | ✅ 정상 |
| wai-formula-library | formula_library | 1,540건 | ✅ 정상 |
| wai-project-docs | project_documentations | 833건 | ✅ 정상 |
| wai-equipment-catalog | equipment_catalog | 709건 | ✅ 정상 |
| wai-symbols | symbols | 527건 | ✅ 정상 |
| wai-site-info | site_info | 250건 | ✅ 정상 |
| wai-3d-models | project_3d_model_files | 158건 | ✅ 정상 |
| wai-3d-library | equipment_files | 71건 | ✅ 정상 |
| wai-process-masters | process_masters | 71건 | ✅ 정상 |
| wai-3d-assets | equipment_files | 40건 | ✅ 정상 |
| wai-common-codes | common_codes | 2건 | ✅ 정상 |
| wai-process-pid | process_pid_excel_relations | 2건 | ✅ 정상 |
| wai-units | units | 8건 | ✅ 정상 |
| wai-vendors | vendors | 13건 | ✅ 정상 |

### 발견된 이상 항목

#### 이상 1 — `bucket_name` 오타 (1,069건)

- **현상**: DB의 `minio_file_uploads.bucket_name` 값이 `'drawing_files'`로 기록됨 (`wai-` 누락)
- **실제**: 파일은 MinIO `wai-drawing-files` 버킷에 정상 존재
- **영향**: MCP에서 `bucket_name` 값으로 MinIO 접근 시 `InvalidBucketName` 오류 발생
- **조치 필요**: `UPDATE minio_file_uploads SET bucket_name='wai-drawing-files' WHERE bucket_name='drawing_files'`

#### 이상 2 — DB 미등록 버킷 3개

| 버킷 | 파일 수 | 비고 |
|---|---|---|
| wai-output-statement | 5개 JSON | 산출서 리포트 — 직접 쓰기 방식으로 추정 |
| wai-project | 315개 UUID 폴더 | 프로젝트 데이터 — `minio_file_uploads` 우회 가능성 |
| wai-project-tmp | 6개 UUID 폴더 | 임시 파일 — 의도적 미등록으로 추정 |

---

## 보안 원칙

| 대상 | 적용 내용 |
|---|---|
| PostgreSQL | `postgres_read` 계정 — SELECT 권한만 허용 |
| PostgreSQL | 세션 `READ ONLY` 강제 설정 (이중 차단) |
| MinIO | `wai-readonly` 커스텀 정책 — ListBucket + GetObject만 허용 |
| 자격증명 | `.env`, `.mcp.json`은 로컬 전용 — git 제외 |
| 네트워크 | 사내망(172.16.0.20) 내부에서만 접근 가능 |
