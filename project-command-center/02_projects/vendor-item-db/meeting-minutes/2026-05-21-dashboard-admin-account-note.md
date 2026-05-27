# Vendor Item DB 대시보드 접속 및 admin 계정 정리

| 항목 | 내용 |
|---|---|
| 기준일 | 2026-05-21 |
| 앱 레포 경로 | `C:\Users\USER\Desktop\vendor-item-db` |
| 관리 문서 경로 | `C:\Users\USER\desktop\project-command-center\02_projects\vendor-item-db` |
| 실행 방식 | Next.js 개발 서버 |
| 접속 URL | `http://127.0.0.1:3000` |
| 로그인 URL | `http://127.0.0.1:3000/login` |
| DB 접속 | `172.16.0.10:9543/postgres`, schema `bkt_vender_db` |
| 앱 런타임 DB URL 메모 | `@prisma/adapter-pg` 런타임에서는 `?schema=` 대신 PostgreSQL `options=-c search_path=bkt_vender_db` 방식 사용 |

## admin 계정

| 항목 | 값 |
|---|---|
| username | `admin` |
| display_name | `시스템 관리자` |
| email | `admin@wai.co.kr` |
| role | `admin` |
| is_active | `true` |
| 임시 비밀번호 | `Admin@1234!` |

## 처리 내용

2026-05-21에 admin 계정 비밀번호를 `Admin@1234!`로 재설정했다.

이 앱은 `src/auth.ts`에서 `bcrypt.compare()`로 `users.password_hash`와 입력 비밀번호를 비교한다. 따라서 기존 비밀번호 원문은 확인할 수 없고, 분실 시에는 새 bcrypt 해시로 `users.password_hash`를 갱신하는 방식으로 재설정해야 한다.

재설정 후 `bcrypt.compare('Admin@1234!', password_hash)` 검증 결과는 정상이다.

## 관련 구현 파일

| 파일 | 역할 |
|---|---|
| `src/auth.ts` | Credentials 로그인, bcrypt 비밀번호 검증, 마지막 로그인 시각 갱신 |
| `src/auth.config.ts` | NextAuth JWT 세션, 로그인 페이지, 세션 role 주입 |
| `src/proxy.ts` | 비로그인 사용자를 `/login`으로 redirect |
| `prisma/schema.prisma` | `users` 테이블 및 관계 모델 |
| `.env` | `DATABASE_URL`, `AUTH_SECRET` 설정 |
| `prisma/schema.prisma` | `schemas = ["bkt_vender_db"]`, 각 모델 `@@schema("bkt_vender_db")` 명시 |

## DB 연결 메모

초기 `.env`는 `?schema=bkt_vender_db` 형식이었지만, 현재 앱 런타임은 `@prisma/adapter-pg`를 통해 node-postgres로 연결한다. 이 경우 Prisma CLI용 `schema` 파라미터가 런타임 search_path로 적용되지 않아 `users` 테이블을 찾지 못할 수 있다.

따라서 앱 실행용 `DATABASE_URL`은 아래처럼 PostgreSQL `search_path` 옵션을 사용하도록 조정했다.

```text
postgresql://postgres:...@172.16.0.10:9543/postgres?options=-c%20search_path%3Dbkt_vender_db
```

추가로 Prisma Client가 스키마를 명시적으로 포함한 쿼리를 생성하도록 `prisma/schema.prisma`에 `schemas = ["bkt_vender_db"]`와 각 모델의 `@@schema("bkt_vender_db")`를 추가한 뒤 `npx.cmd prisma generate`를 실행했다.

검증 결과:

| 검증 | 결과 |
|---|---|
| `npm.cmd run build` | 성공 |
| `/login` GET | 200 |
| admin credentials 로그인 | 302 redirect |
| 로그인 세션으로 `/` 접근 | 200 |

## 보안 메모

현재 비밀번호는 임시값이다. 외부 공유 전에는 운영용 비밀번호로 변경하고, 문서에는 평문 비밀번호를 남기지 않는 방식으로 전환하는 것이 좋다.
