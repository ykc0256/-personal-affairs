# Step 2 — PostgreSQL 읽기 전용 계정 설정 (DBeaver 기준)

## 순서 요약

```
1. DBeaver에서 관리자 계정으로 SQL 실행 → 읽기 전용 계정 생성
2. DBeaver에서 새 연결 추가 → 읽기 전용 계정으로 접속 확인
3. .env 파일 작성
4. python main.py 로 코드 연결 테스트
```

---

## 1. DBeaver — 읽기 전용 계정 생성 SQL

> **관리자(superuser) 계정**으로 접속된 상태에서 실행하세요.
> DBeaver 상단 메뉴 → SQL 편집기 → 새 SQL 편집기 (Ctrl+])

```sql
-- 1) 읽기 전용 역할 생성
CREATE ROLE readonly_role;

-- 2) 역할에 권한 부여
GRANT CONNECT ON DATABASE your_db TO readonly_role;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;

-- 이후 생성될 테이블에도 자동 적용
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly_role;

-- 3) 실제 사용할 계정 생성 후 역할 부여
CREATE USER app_readonly WITH PASSWORD 'your_strong_password';
GRANT readonly_role TO app_readonly;
```

> `your_db`, `your_strong_password` 는 실제 값으로 변경 후 실행하세요.

---

## 2. DBeaver — 읽기 전용 계정으로 새 연결 추가

새 연결이 정상 동작하는지 DBeaver에서 먼저 확인합니다.

```
1. DBeaver 좌측 상단 → [새 데이터베이스 연결] (Ctrl+Shift+N)
2. PostgreSQL 선택
3. 접속 정보 입력:
   - Host     : DB 서버 IP (예: 192.168.x.x)
   - Port     : 5432
   - Database : your_db
   - Username : app_readonly
   - Password : your_strong_password
4. [연결 테스트] 버튼 클릭 → "연결되었습니다" 확인
5. 확인 후 저장
```

### 쓰기 차단 확인 (선택)

새로 만든 `app_readonly` 연결로 아래 SQL 실행 시 **오류가 나야 정상**입니다.

```sql
-- 이 쿼리는 반드시 실패해야 합니다
INSERT INTO some_table VALUES (1);
-- 예상 오류: ERROR: permission denied for table some_table
```

---

## 3. .env 파일 작성

프로젝트 루트의 `.env.example`을 복사해 `.env`로 저장 후 실제 값 입력:

```bash
DB_HOST=192.168.x.x
DB_PORT=5432
DB_NAME=your_db
DB_USER=app_readonly
DB_PASSWORD=your_strong_password

OPENAI_API_KEY=sk-...
```

---

## 4. Python 연결 테스트

```bash
pip install -r requirements.txt
python main.py
```

### 정상 출력 예시

```
{'current_user': 'app_readonly', 'current_database': 'your_db', 'now': datetime(...)}
```

`current_user` 가 `app_readonly` 로 찍히면 연결 성공입니다.

---

## 문제 발생 시 체크리스트

| 증상 | 확인 사항 |
|------|----------|
| DBeaver 연결 실패 | DB 서버 IP/포트, 방화벽 확인 |
| `password authentication failed` | .env 비밀번호 오타 확인 |
| `permission denied` | GRANT 구문이 정상 실행됐는지 확인 |
| `could not connect to server` | DB 서버가 사내망 내부에서 접근 가능한지 확인 |
