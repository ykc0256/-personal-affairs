# Step 3 — Claude에서 직접 DB 조회 (MCP 연동)

## MCP가 뭔가요?

MCP(Model Context Protocol)는 Claude가 외부 시스템(DB, API 등)에 직접 연결할 수 있게 해주는 프로토콜입니다.  
이 프로젝트에서는 MCP를 통해 Claude가 PostgreSQL DB에 직접 쿼리를 날립니다.

**Python 코드를 실행하지 않아도 됩니다.** Claude Code 대화창에서 바로 조회합니다.

---

## 사전 조건

Node.js가 설치되어 있어야 합니다. MCP 서버(`@modelcontextprotocol/server-postgres`)가 Node.js로 동작합니다.

```
node --version   → v18 이상이면 OK
```

없으면 https://nodejs.org 에서 LTS 버전 설치.

---

## 설정

프로젝트 루트에 `.mcp.json` 파일을 직접 만들어서 아래 내용을 작성합니다.

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

### 비밀번호에 특수문자가 있는 경우

URL 안에 들어가는 비밀번호는 특수문자를 그대로 쓰면 오류가 납니다. 아래와 같이 변환하세요.

| 원래 문자 | URL 인코딩 |
|----------|-----------|
| `!` | `%21` |
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |

예) 비밀번호가 `wai!@123` 이면 → `wai%21%40123`

### 파일 저장 위치 확인

```
pg-openai-readonly/
├── .mcp.json    ← 여기에 있어야 합니다 (프로젝트 루트)
├── README.md
└── ...
```

> **중요**: `.mcp.json`에는 비밀번호가 포함됩니다. git에 올리면 안 됩니다.  
> `.gitignore`에 이미 등록되어 있으므로 별도 작업은 필요 없습니다.

---

## 연결 확인

`.mcp.json`을 저장한 후 **Claude Code를 완전히 종료하고 다시 시작**하세요.

재시작 후 이 프로젝트 폴더를 열면 Claude가 자동으로 DB에 연결됩니다.

### 연결 테스트 질문

```
이 DB에 어떤 테이블이 있어?
```

테이블 목록이 나오면 연결 성공입니다.

---

## 사용 예시

```
나: vendors 테이블에서 최근에 등록된 항목 5개 보여줘
Claude: (DB 조회 후) 아래와 같습니다 ...

나: 이번 달 데이터 건수 요약해줘
Claude: (집계 후) 5월 기준 총 OO건 ...
```

SQL을 직접 짤 필요 없이 자연어로 물어보면 Claude가 쿼리를 생성하고 결과를 해석해 답합니다.

---

## 문제 발생 시 체크리스트

| 증상 | 확인 사항 |
|------|----------|
| 테이블 목록이 안 나옴 | `.mcp.json` 파일이 프로젝트 루트에 있는지 확인 |
| 연결 오류 | 사내망(172.16.0.20) 접속 가능한 환경인지 확인 |
| 비밀번호 오류 | 특수문자 URL 인코딩 여부 확인 |
| Node.js 오류 | `node --version` 실행해서 v18 이상인지 확인 |

---

## 보안 요약

- DB 계정(`postgres_read`)은 **SELECT 권한만** 있습니다 — 수정, 삭제 불가
- 코드 레벨에서도 세션을 `READ ONLY`로 설정해 이중으로 차단
- `.mcp.json`은 로컬에만 존재하며 git에 포함되지 않습니다
