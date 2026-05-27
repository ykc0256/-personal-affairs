# pg-openai-readonly

사내 PostgreSQL DB를 Claude AI에 연결해서, 대화 형식으로 데이터를 조회하는 프로젝트입니다.

**핵심 개념**: DB에는 읽기 전용 계정으로만 접근합니다. 데이터를 수정하거나 삭제하는 것은 구조적으로 불가능합니다.

---

## 이게 뭐야?

```
나: "이번 달 설계 건수 몇 개야?"
Claude: (DB 직접 조회 후) "5월 기준 총 23건입니다. 그 중 완료는 18건, 진행 중은 5건입니다."
```

Claude Code 대화창에서 자연어로 질문하면, Claude가 DB에서 직접 데이터를 찾아 답해줍니다.
SQL을 몰라도 됩니다.

---

## 연결 구조

```
Claude Code (대화창)
      │
      │  MCP (Model Context Protocol)
      ▼
PostgreSQL MCP Server  ← Node.js로 실행되는 중간 브릿지
      │
      │  읽기 전용 계정 (postgres_read)
      ▼
PostgreSQL DB
  Host : 172.16.0.20:5432
  DB   : postgres
  Schema: bkt_wai_design
```

---

## 사전 조건

| 항목 | 확인 방법 | 필요 버전 |
|------|----------|----------|
| 사내망 접속 | `172.16.0.20`에 ping 가능해야 함 | — |
| Python | `python --version` | 3.10 이상 |
| Node.js | `node --version` | 18 이상 |

Node.js가 없으면 https://nodejs.org 에서 LTS 버전 설치.

---

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone <레포 주소>
cd pg-openai-readonly
```

### 2. Python 패키지 설치

```bash
pip install -r requirements.txt
```

### 3. MCP 설정 파일 생성

프로젝트 루트에 `.mcp.json` 파일을 아래 내용으로 직접 만드세요.  
비밀번호의 특수문자는 URL 인코딩이 필요합니다 (`!` → `%21`, `@` → `%40`).

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres_read:비밀번호@172.16.0.20:5432/postgres?options=-csearch_path%3Dbkt_wai_design"
      ]
    }
  }
}
```

> `.mcp.json`은 접속 비밀번호가 포함되므로 git에 올리면 안 됩니다. `.gitignore`에 이미 등록되어 있습니다.

### 4. Claude Code 재시작

`.mcp.json` 저장 후 Claude Code를 완전히 종료하고 다시 열면 자동으로 DB에 연결됩니다.

---

## 사용법

Claude Code 대화창에서 바로 질문하면 됩니다.

```
이 DB에 어떤 테이블이 있어?
```
```
[테이블명] 에서 최근 데이터 10개 보여줘
```
```
이번 달에 등록된 항목 수 알려줘
```

---

## 파일 구조

```
pg-openai-readonly/
│
├── README.md                   ← 지금 이 파일
│
├── docs/
│   ├── architecture.md         ← 전체 설계 구조 상세 설명
│   ├── step2_db_setup.md       ← DB 읽기 전용 계정 생성 방법 (DBeaver 기준)
│   └── step3_claude_mcp.md     ← Claude MCP 연동 상세 가이드
│
├── src/
│   ├── config.py               ← 환경변수 로딩
│   ├── db/connection.py        ← PostgreSQL 연결 및 쿼리 실행
│   └── ai/client.py            ← OpenAI API 클라이언트
│
├── main.py                     ← Python 단독 실행 진입점 (테스트용)
├── requirements.txt            ← Python 패키지 목록
├── .mcp.json                   ← MCP 설정 (git 제외, 직접 생성 필요)
└── .gitignore
```

---

## 진행 단계

- [x] Step 1 — 프로젝트 기본 구조 세팅
- [x] Step 2 — PostgreSQL 읽기 전용 계정 생성 → [step2_db_setup.md](docs/step2_db_setup.md)
- [ ] Step 3 — Claude MCP 연동 및 실사용 → [step3_claude_mcp.md](docs/step3_claude_mcp.md)

---

## 보안 원칙

| 항목 | 적용 내용 |
|------|----------|
| DB 계정 권한 | `SELECT`만 허용 — INSERT/UPDATE/DELETE 불가 |
| 세션 설정 | `READ ONLY` 모드 강제 적용 (이중 차단) |
| 자격증명 관리 | `.mcp.json`은 git 제외, 로컬에만 보관 |
| 네트워크 | 사내망 내부(`172.16.0.20`)에서만 접근 가능 |
