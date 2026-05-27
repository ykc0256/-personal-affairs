# 아키텍처 구조 설명

## 전체 흐름

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

---

## 디렉터리 구조

```
pg-openai-readonly/
│
├── main.py                  # 실행 진입점
│
├── src/                     # 핵심 소스 코드
│   ├── config.py            # 환경변수 로딩 (DB 접속 정보, API 키)
│   │
│   ├── db/
│   │   └── connection.py    # PostgreSQL 읽기 전용 연결 및 쿼리 실행
│   │
│   └── ai/
│       └── client.py        # OpenAI 클라이언트 래퍼
│
├── docs/
│   └── architecture.md      # 이 파일 - 구조 설명
│
├── .env.example             # 환경변수 템플릿 (git 포함)
├── .env                     # 실제 자격증명 (git 제외)
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 모듈별 역할

### `src/config.py`
- `.env` 파일에서 환경변수를 로딩하는 단일 진입점
- DB 접속 정보와 OpenAI API 키를 상수로 제공
- 모든 모듈이 직접 `os.getenv()`를 쓰지 않고 이 파일을 통해 참조

### `src/db/connection.py`
- PostgreSQL 연결 및 SELECT 쿼리 실행
- 세션 레벨 `READ ONLY` 강제 (`default_transaction_read_only=on`)
- DB 계정 권한(SELECT only) + 세션 설정 두 겹으로 쓰기 차단

### `src/ai/client.py`
- OpenAI API 호출 래퍼
- 모델명은 `config.py`에서 관리 (기본값: `gpt-4o`)
- `ask(system_prompt, user_message)` 단일 인터페이스 제공

### `main.py`
- 각 모듈을 조합해 실제 동작 로직 구현
- 현재는 DB 연결 테스트만 포함, 이후 OpenAI 연동 로직 추가 예정

---

## 보안 설계 원칙

| 항목 | 적용 내용 |
|------|----------|
| 자격증명 관리 | `.env` 파일로 분리, git 제외 |
| DB 접근 제한 | 읽기 전용 계정 + 세션 READ ONLY 이중 적용 |
| 네트워크 | 사내망 내부에서만 DB 포트 허용 |
| API 키 | 환경변수로만 관리, 코드 내 하드코딩 금지 |

---

## 단계별 진행 계획

| 단계 | 내용 | 상태 |
|------|------|------|
| Step 1 | 프로젝트 기본 구조 세팅 | ✅ 완료 |
| Step 2 | PostgreSQL 읽기 전용 계정 설정 및 연결 확인 | ✅ 완료 → [step2_db_setup.md](step2_db_setup.md) |
| Step 3 | Claude MCP 연동 및 실사용 | ✅ 완료 → [step3_claude_mcp.md](step3_claude_mcp.md) |
