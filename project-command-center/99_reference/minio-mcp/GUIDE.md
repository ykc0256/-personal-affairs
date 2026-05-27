# MinIO Read-Only MCP — 사용 가이드

> 최종 확인: 2026-05-18 | 서버: `172.16.0.20:9000` | 계정: `waiuser`

---

## 1. 연결 상태

| 항목 | 상태 | 비고 |
|---|---|---|
| MinIO 서버 접속 | ✅ 정상 | `172.16.0.20:9000` |
| `list_buckets` (버킷 목록) | ✅ 정상 | 18개 버킷 확인 |
| `list_objects` (파일 목록) | ✅ 정상 | `wai-readonly` 정책 적용 후 해결 |
| `read_object` (파일 읽기) | ✅ 정상 | 텍스트/JSON/CSV 파일 가능 |

### 적용된 정책: `wai-readonly`

MinIO 기본 `readonly` 정책은 `s3:ListBucket` 권한이 빠져 있어 파일 목록 조회가 안 됨.  
아래 커스텀 정책을 생성하여 `waiuser`에 적용 완료 (2026-05-18).

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

---

## 2. Claude Code 연결 설정

`C:\Users\USER\.claude\settings.json`에 추가:

```json
{
  "mcpServers": {
    "minio": {
      "type": "stdio",
      "command": "python",
      "args": ["C:/Users/USER/desktop/minio-readonly-mcp/server.py"]
    }
  }
}
```

> Claude Code 재시작 후 적용됩니다.

---

## 3. 서버 실행

### 직접 실행 (로컬)

```powershell
cd C:\Users\USER\desktop\minio-readonly-mcp
pip install -r requirements.txt
python server.py
```

### Docker 실행 (사내 서버 배포용)

```bash
docker compose up -d
curl http://localhost:8000/health
```

---

## 4. 제공 툴 (MCP Tools)

### `list_buckets` — 버킷 목록 조회

```json
{}
```

### `list_objects` — 버킷 내 파일 목록

```json
{
  "bucket": "wai-drawing-files",
  "prefix": "0198f36d-/",   // 선택: 경로 필터
  "recursive": false          // 선택: 하위 폴더 포함 여부
}
```

### `get_object_info` — 파일 메타데이터 조회

```json
{
  "bucket": "wai-output-statement",
  "object_name": "project (1).json"
}
```

### `read_object` — 텍스트 파일 읽기 (최대 10MB)

```json
{
  "bucket": "wai-output-statement",
  "object_name": "project (1).json",
  "encoding": "utf-8"
}
```

> PDF, DXF, 이미지 등 바이너리 파일은 읽기 불가 (텍스트/JSON/CSV만 가능)

---

## 5. 버킷 목록 및 현황 (18개)

| 버킷 이름 | 항목 수 | 구조 | 용도 |
|---|---|---|---|
| `wai-3d-assets` | 1 | `preset/` | 3D 에셋 프리셋 |
| `wai-3d-library` | 28 | UUID 폴더 | 3D 라이브러리 |
| `wai-3d-models` | 154 | UUID 폴더 | 3D 모델 파일 |
| `wai-common-codes` | 2 | UUID 폴더 | 공통 코드 체계 |
| `wai-drawing-files` | 1,100 | UUID 폴더 | 도면 파일 |
| `wai-equipment-catalog` | 664 | UUID 폴더 | 장비 카탈로그 |
| `wai-equipment-files` | 1,800 | UUID 폴더 | 장비 관련 파일 |
| `wai-formula-library` | 1,525 | UUID 폴더 | 계산식 라이브러리 |
| `wai-output-statement` | 5 | `statement/` + JSON | 산출물/계산서 |
| `wai-process-masters` | 70 | UUID 폴더 | 프로세스 마스터 |
| `wai-process-pid` | 3 | UUID 폴더 + `pid_excel_mapping/` | P&ID 파일 |
| `wai-project` | 315 | UUID 폴더 | 프로젝트 데이터 |
| `wai-project-docs` | 834 | UUID 폴더 | 프로젝트 문서 |
| `wai-project-tmp` | 6 | UUID 폴더 | 임시 파일 |
| `wai-site-info` | 208 | UUID 폴더 | 현장 정보 |
| `wai-symbols` | 492 | UUID 폴더 | 도면 심볼 |
| `wai-units` | 8 | UUID 폴더 | 단위 정보 |
| `wai-vendors` | 13 | UUID 폴더 | 벤더 정보 |

---

## 6. 환경 변수 (.env)

```env
MINIO_ENDPOINT=172.16.0.20:9000
MINIO_ACCESS_KEY=waiuser
MINIO_SECRET_KEY=waiuserpassword
MINIO_SECURE=false
MAX_OBJECT_SIZE_MB=10
```

---

## 7. 아키텍처

```
[Claude Code]
     ↓ stdio (MCP)
[server.py]  ←  .env (접속 정보)
     ↓
[MinIO :9000]  172.16.0.20
     waiuser — wai-readonly 정책 (조회/읽기 전용)
```
