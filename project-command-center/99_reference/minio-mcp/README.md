# MinIO Read-Only MCP Server

MinIO 데이터를 **읽기 전용**으로 Claude에 연결하는 MCP 서버입니다.  
사내 IP 대역에서만 접근 가능하도록 제한됩니다.

## 제공 기능 (읽기 전용)

| 툴 | 설명 |
|---|---|
| `list_buckets` | 전체 버킷 목록 조회 |
| `list_objects` | 버킷 내 객체(파일) 목록 조회 |
| `get_object_info` | 객체 메타데이터 조회 (크기, 타입, 수정일) |
| `read_object` | 텍스트 파일 내용 읽기 (최대 10MB) |

쓰기/삭제/수정 기능은 없습니다.

## 서버 배포 (사내 서버)

### Docker 사용 (권장)

```bash
# 1. 설정 파일 생성
cp .env.example .env
# .env 파일을 열어 MinIO 접속 정보 및 허용 IP 대역 입력

# 2. 실행
docker compose up -d

# 3. 상태 확인
curl http://localhost:8000/health
```

### 직접 실행

```bash
pip install -r requirements.txt
cp .env.example .env
# .env 수정 후:
python server.py
```

## .env 설정 예시

```env
MINIO_ENDPOINT=192.168.1.100:9000
MINIO_ACCESS_KEY=readonly-user
MINIO_SECRET_KEY=secret
MINIO_SECURE=false

# 허용할 사내 IP 대역
ALLOWED_NETWORKS=192.168.0.0/16,10.0.0.0/8

MAX_OBJECT_SIZE_MB=10
SERVER_PORT=8000
```

> **보안 팁**: MinIO에서 읽기 전용 전용 계정을 만들어 사용하세요.  
> MinIO 콘솔 → Identity → Users → 새 유저 생성 → `readonly` 정책 할당

## Claude Code 연결 설정

사내 PC의 `~/.claude/settings.json`에 추가:

```json
{
  "mcpServers": {
    "minio": {
      "type": "sse",
      "url": "http://사내서버IP:8000/sse"
    }
  }
}
```

Claude Code 재시작 후 사용 가능합니다.

## 접근 제어 구조

```
[Claude Code 클라이언트]
        ↓ HTTP/SSE
[MCP Server :8000]  ← 사내 IP만 허용 (IP Whitelist)
        ↓
[MinIO Server :9000]  ← 읽기 전용 계정
```

외부 IP는 MCP 서버 단계에서 403으로 차단됩니다.
