# WAI MCP 연동 가이드

> 최종 업데이트: 2026-05-18  
> 사내 PostgreSQL DB와 MinIO 스토리지를 Claude Code에 MCP로 연결하는 프로젝트입니다.

---

## 목차

1. [전체 구조](#1-전체-구조)
2. [MCP 서버 목록](#2-mcp-서버-목록)
3. [아키텍처](#3-아키텍처)
4. [설치 및 설정](#4-설치-및-설정)
5. [MinIO MCP](#5-minio-mcp)
6. [PostgreSQL MCP](#6-postgresql-mcp)
7. [보안 원칙](#7-보안-원칙)
8. [문제 해결](#8-문제-해결)

> **DB + MinIO 조회 규칙** → [mcp-query-guide.md](mcp-query-guide.md)

---

## 1. 전체 구조

```
wai-mcp/
├── .mcp.json                  ← Claude Code MCP 통합 설정 (이 파일로 전체 연결)
│
├── minio-readonly-mcp/        ← MinIO 읽기 전용 MCP 서버 (Python)
│   ├── server.py
│   ├── .env
│   └── requirements.txt
│
└── pg-openai-readonly/        ← PostgreSQL + OpenAI 연동 프로젝트
    ├── .mcp.json              ← PostgreSQL MCP 단독 설정 (하위 프로젝트용)
    ├── main.py
    ├── src/
    │   ├── config.py
    │   ├── db/connection.py
    │   └── ai/client.py
    └── docs/
        ├── architecture.md
        ├── step2_db_setup.md
        └── step3_claude_mcp.md
```

**루트의 `.mcp.json` 하나로 MinIO + PostgreSQL 두 MCP를 동시에 사용합니다.**

---

## 2. MCP 서버 목록

`C:\Users\USER\desktop\wai-mcp\.mcp.json`

```json
{
  "mcpServers": {
    "minio": {
      "command": "python",
      "args": ["C:\\Users\\USER\\desktop\\wai-mcp\\minio-readonly-mcp\\server.py"],
      "env": {
        "MINIO_ENDPOINT": "172.16.0.20:9000",
        "MINIO_ACCESS_KEY": "waiuser",
        "MINIO_SECRET_KEY": "waiuserpassword",
        "MINIO_SECURE": "false",
        "MAX_OBJECT_SIZE_MB": "10"
      }
    },
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres_read:wai%21%40123@172.16.0.20:5432/postgres?options=-csearch_path%3Dbkt_wai_design"
      ]
    }
  }
}
```

### 연결 상태 확인

```powershell
cd C:\Users\USER\desktop\wai-mcp
claude mcp list
```

| 서버 | 명령 | 상태 |
|------|------|------|
| `minio` | `python server.py` | ✅ Connected |
| `postgres` | `npx @modelcontextprotocol/server-postgres` | ✅ Connected |

---

## 3. 아키텍처

### 전체 흐름

```
[Claude Code 대화창]
        │
        │  MCP (Model Context Protocol / stdio)
        ├─────────────────────┬──────────────────────
        ↓                     ↓
[minio MCP Server]     [postgres MCP Server]
  Python / server.py     Node.js / npx
        │                     │
        ↓                     ↓
[MinIO :9000]          [PostgreSQL :5432]
  172.16.0.20            172.16.0.20
  waiuser                postgres_read
  (읽기 전용 정책)        (SELECT only)
```

### pg-openai-readonly 내부 구조

```
[사용자 입력]
      ↓
  main.py
      ↓               ↓
src/db/           src/ai/
connection.py     client.py
      ↓               ↓
[PostgreSQL DB]  [OpenAI API]
 (사내망 내부)    (외부 HTTPS)
      ↑
  src/config.py (.env 로딩)
```

### 모듈별 역할

| 모듈 | 역할 |
|------|------|
| `src/config.py` | `.env`에서 DB 접속 정보 및 OpenAI API 키 로딩. 모든 모듈의 단일 참조 진입점 |
| `src/db/connection.py` | PostgreSQL 읽기 전용 연결. 세션 레벨 `READ ONLY` 강제 |
| `src/ai/client.py` | OpenAI API 래퍼. `ask(system_prompt, user_message)` 인터페이스 제공 |
| `main.py` | 각 모듈 조합 및 동작 로직. 현재 DB 연결 테스트 포함 |

---

## 4. 설치 및 설정

### 사전 조건

| 항목 | 확인 방법 | 요구 버전 |
|------|----------|----------|
| 사내망 접속 | `172.16.0.20`에 ping 가능 | — |
| Python | `python --version` | 3.10 이상 |
| Node.js | `node --version` | 18 이상 |

### Python 패키지 설치 (MinIO MCP용)

```powershell
pip install mcp[cli] minio python-dotenv
# 또는
pip install -r minio-readonly-mcp\requirements.txt
```

### Claude Code 재시작

`.mcp.json` 저장 후 Claude Code를 완전히 종료하고 다시 시작해야 MCP가 로드됩니다.

---

## 5. MinIO MCP

### 접속 정보

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `172.16.0.20:9000` |
| 계정 | `waiuser` |
| 정책 | `wai-readonly` (커스텀) |
| 최대 파일 읽기 크기 | 10MB |

### wai-readonly 정책 (커스텀)

MinIO 기본 `readonly` 정책은 `s3:ListBucket` 권한이 없어 파일 목록 조회가 불가합니다.  
아래 커스텀 정책을 생성해 `waiuser`에 적용합니다.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListAllMyBuckets",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:GetObject"
      ],
      "Resource": ["arn:aws:s3:::*"]
    }
  ]
}
```

### 제공 툴 (MCP Tools)

| 툴 | 설명 | 필수 파라미터 |
|-----|------|------------|
| `list_buckets` | 전체 버킷 목록 조회 | 없음 |
| `list_objects` | 버킷 내 파일 목록 조회 | `bucket` |
| `get_object_info` | 파일 메타데이터 조회 (크기, 타입, 수정일) | `bucket`, `object_name` |
| `read_object` | 텍스트 파일 내용 읽기 (최대 10MB) | `bucket`, `object_name` |

> PDF, DXF, 이미지 등 바이너리 파일은 읽기 불가. 텍스트/JSON/CSV만 가능.

### 사용 예시

```
버킷 목록 보여줘

wai-drawing-files 버킷에서 0198f36d- 로 시작하는 파일 목록 알려줘

wai-output-statement/project (1).json 파일 내용 읽어줘
```

### 버킷 목록 (18개)

| 버킷 이름 | 항목 수 | 용도 |
|----------|---------|------|
| `wai-3d-assets` | 1 | 3D 에셋 프리셋 |
| `wai-3d-library` | 28 | 3D 라이브러리 |
| `wai-3d-models` | 154 | 3D 모델 파일 |
| `wai-common-codes` | 2 | 공통 코드 체계 |
| `wai-drawing-files` | 1,100 | 도면 파일 |
| `wai-equipment-catalog` | 664 | 장비 카탈로그 |
| `wai-equipment-files` | 1,800 | 장비 관련 파일 |
| `wai-formula-library` | 1,525 | 계산식 라이브러리 |
| `wai-output-statement` | 5 | 산출물/계산서 |
| `wai-process-masters` | 70 | 프로세스 마스터 |
| `wai-process-pid` | 3 | P&ID 파일 |
| `wai-project` | 315 | 프로젝트 데이터 |
| `wai-project-docs` | 834 | 프로젝트 문서 |
| `wai-project-tmp` | 6 | 임시 파일 |
| `wai-site-info` | 208 | 현장 정보 |
| `wai-symbols` | 492 | 도면 심볼 |
| `wai-units` | 8 | 단위 정보 |
| `wai-vendors` | 13 | 벤더 정보 |

---

## 6. PostgreSQL MCP

### 접속 정보

| 항목 | 값 |
|------|-----|
| 호스트 | `172.16.0.20:5432` |
| DB | `postgres` |
| 스키마 | `bkt_wai_design` |
| 계정 | `postgres_read` (SELECT 전용) |

### 비밀번호 URL 인코딩 규칙

비밀번호에 특수문자가 있으면 URL 인코딩이 필요합니다.

| 원래 문자 | URL 인코딩 |
|----------|-----------|
| `!` | `%21` |
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |

예) `wai!@123` → `wai%21%40123`

### 읽기 전용 계정 생성 SQL (DBeaver, 관리자 계정으로 실행)

```sql
-- 1) 읽기 전용 역할 생성
CREATE ROLE readonly_role;

-- 2) 역할에 권한 부여
GRANT CONNECT ON DATABASE postgres TO readonly_role;
GRANT USAGE ON SCHEMA bkt_wai_design TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA bkt_wai_design TO readonly_role;

-- 이후 생성될 테이블에도 자동 적용
ALTER DEFAULT PRIVILEGES IN SCHEMA bkt_wai_design
    GRANT SELECT ON TABLES TO readonly_role;

-- 3) 계정 생성 및 역할 부여
CREATE USER postgres_read WITH PASSWORD '비밀번호';
GRANT readonly_role TO postgres_read;
```

### 사용 예시

```
이 DB에 어떤 테이블이 있어?

vendors 테이블에서 최근에 등록된 항목 5개 보여줘

이번 달 설계 건수 몇 개야?
```

SQL을 직접 작성하지 않아도 Claude가 자연어로 쿼리를 생성하고 결과를 해석합니다.

### 진행 단계

| 단계 | 내용 | 상태 |
|------|------|------|
| Step 1 | 프로젝트 기본 구조 세팅 | ✅ 완료 |
| Step 2 | PostgreSQL 읽기 전용 계정 생성 및 연결 확인 | ✅ 완료 |
| Step 3 | Claude MCP 연동 및 실사용 | ✅ 완료 |

---

## 7. 보안 원칙

| 항목 | 적용 내용 |
|------|----------|
| DB 계정 권한 | `SELECT`만 허용 — INSERT/UPDATE/DELETE 불가 |
| DB 세션 설정 | `READ ONLY` 모드 강제 적용 (이중 차단) |
| MinIO 계정 | `wai-readonly` 커스텀 정책 — 조회/읽기 전용 |
| 자격증명 관리 | `.mcp.json`, `.env` 는 git 제외, 로컬에만 보관 |
| 네트워크 | 사내망(`172.16.0.20`) 내부에서만 접근 가능 |
| 코드 | 환경변수로만 자격증명 관리, 하드코딩 금지 |

---

## 8. 문제 해결

| 증상 | 확인 사항 |
|------|----------|
| MCP 연결 안 됨 | `claude mcp list` 실행해서 Connected 상태 확인 |
| 사내망 접속 불가 | `172.16.0.20`에 ping 가능한지 확인 |
| PostgreSQL 비밀번호 오류 | 특수문자 URL 인코딩 여부 확인 |
| MinIO 파일 목록 안 나옴 | `wai-readonly` 커스텀 정책이 `waiuser`에 적용됐는지 확인 |
| MinIO 파일 읽기 실패 | 파일이 텍스트/JSON/CSV인지 확인 (바이너리 불가) |
| Node.js 오류 | `node --version` → v18 이상 필요 |
| Python 패키지 오류 | `pip install mcp[cli] minio python-dotenv` 재실행 |
