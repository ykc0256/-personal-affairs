# Vendor Item DB 샘플 개발 계획

## 개요

| 항목 | 내용 |
|---|---|
| 목적 | Vendor 업체 평가·우선순위 관리 + 품목별 제안가/설계가 정리 DB 구축 및 웹 관리 시스템 샘플 제작 |
| 결과물 | DB 스키마 + 웹 샘플 앱 (Excel 업로드 → DB 반영 + 권한별 조회) |
| 기준일 | 2026-05-21 |
| 상태 | 설계 진행 중 |
| 샘플 DB | 172.16.0.10:9543 / schema: vendor_db |
| MCP 서버 | postgres-vendor (이 레포 `.mcp.json` 등록 완료) |

---

## 사용 목적 (확정)

> 2026-05-21 확정

**핵심 목적 두 가지:**

1. **Vendor 평가 및 우선순위 관리**
   - 업체별 평가 항목 (재무건전성, 실적, 사용자 평가 등) 입력 및 조회
   - 평가 이력 누적 관리
   - 우선순위 산정 및 비교

2. **품목별 제안가 / 설계가 관리**
   - Vendor가 공급하는 품목(Item)별 제안가·설계가 등록
   - 기준일·버전 관리로 가격 이력 추적 가능

**운영 방식:**
- Excel 템플릿으로 데이터 업로드 → DB 자동 반영
- 수정/보완이 용이한 웹 인터페이스 제공
- 계정별 역할 구분: 설계가 등 민감 정보는 특정 역할만 열람 가능

---

## 핵심 기능 정의

| 기능 | 설명 |
|---|---|
| Vendor 평가 | 업체별 평가 항목 입력, 점수화, 우선순위 산정 |
| 가격 관리 | 품목별 제안가/설계가 등록 및 이력 조회 |
| Excel 업로드 | 정해진 템플릿으로 Excel 업로드 시 DB에 자동 반영 |
| DB 조회 | 업체 / 품목 / 단가 검색 및 목록 표시 |
| 권한별 접근 제어 | 사용자 역할에 따라 설계가 등 민감 정보 열람 범위 구분 |
| 업로드 이력 관리 | 누가 언제 어떤 파일을 올렸는지 이력 보관 |

---

## 업무 단계

### Phase 1 — DB 설계 (이번 주)

| 작업 | 산출물 | 위치 |
|---|---|---|
| 테이블 정의 (Vendor / Item / 설계가 / User) | `db-design/table-definitions.md` | 이 폴더 |
| ER 다이어그램 (텍스트) | `db-design/er-diagram.md` | 이 폴더 |
| 권한 매트릭스 | `web-design/permission-matrix.md` | 이 폴더 |
| DDL (CREATE TABLE) | `db-design/schema.sql` | 이 폴더 |

### Phase 2 — 샘플 앱 개발

| 작업 | 설명 |
|---|---|
| 기술 스택 확정 | Backend / Frontend / 인증 방식 결정 |
| Excel 업로드 파이프라인 | 템플릿 정의 → 파서 → DB 적재 |
| 조회 API | Vendor / Item / 설계가 검색 엔드포인트 |
| 권한 인증 | JWT 기반 로그인 + 역할별 접근 제어 |
| 프론트엔드 | 업로드 화면 + 조회 화면 |

### Phase 3 — 검증 및 피드백

| 작업 | 설명 |
|---|---|
| 샘플 데이터 입력 | Excel 템플릿으로 테스트 데이터 업로드 |
| 권한별 동작 확인 | 역할별 접근 범위 테스트 |
| P팀 피드백 반영 | 실사용 요건 반영 후 구조 보완 |

---

## DB 구성 테이블 (1차 안)

| 테이블 | 역할 | 비고 |
|---|---|---|
| `users` | 사용자 계정 + 역할 | 로그인 / 권한 관리 |
| `vendors` | 업체 정보 | 업체명, 유형, 국가, 상태 |
| `items` | 기자재 / 아이템 | 품목명, 분류, 규격, 단위 |
| `design_prices` | 설계가 / 단가 | 아이템별 업체 단가 + 기준일 |
| `vendor_items` | Vendor ↔ Item 연결 | 취급 품목 매핑 |
| `excel_uploads` | 업로드 이력 | 파일명, 업로더, 적재 결과 |

---

## 권한 구분 (1차 안)

| 역할 | 열람 범위 | 입력/수정 |
|---|---|---|
| `admin` | 전체 (설계가 포함) | 전체 |
| `procurement` | Vendor + Item + 설계가 전체 | 업로드 가능 |
| `engineer` | Vendor 기본정보 + 품목 목록 | 불가 (설계가 열람 불가) |
| `viewer` | 공개 범위만 (설계가 열람 불가) | 불가 |

> **설계가(단가)는 admin / procurement 역할만 열람 가능**  
> 역할별 조회 범위 상세는 `web-design/permission-matrix.md`에서 관리

---

## 기술 스택 (제안)

| 구분 | 선택 | 비고 |
|---|---|---|
| Backend | FastAPI (Python) | GWD와 별개 독립 앱 |
| Frontend | React (Vite) | 샘플 수준, 빠른 구성 |
| DB | PostgreSQL 172.16.0.10:9543 | schema: vendor_db |
| 인증 | JWT (access + refresh token) | 역할(role) 클레임 포함 |
| 파일 파싱 | openpyxl (Python) | Excel 업로드 파싱 |
| 파일 저장 | 로컬 경로 or MinIO | 샘플은 로컬 우선 |

> GWD와는 **완전히 별개 독립 앱**으로 개발 (코드베이스 분리)

---

## 폴더 구조 (이 프로젝트 내)

```
02_projects/vendor-item-db/
├── vendor-item-db-design.md          ← DB/프로젝트 전체 설계 배경
├── vendor-item-db-progress.md        ← 진행 로그
├── vendor-item-db-sample-plan.md     ← 이 문서 (샘플 개발 계획)
├── requirements/
│   ├── db-requirements.md            ← DB 요구사항 상세
│   └── web-requirements.md           ← 웹 요구사항 상세
├── db-design/
│   ├── er-diagram.md                 ← ER 다이어그램
│   ├── table-definitions.md          ← 테이블/컬럼 정의서
│   └── schema.sql                    ← DDL
├── web-design/
│   ├── screen-flow.md                ← 화면 흐름도
│   └── permission-matrix.md          ← 권한 매트릭스
└── meeting-minutes/
    └── 2026-05-21-P팀-VendorDB-논의.md
```

> 샘플 앱 코드는 별도 레포에서 관리 (경로 확정 후 여기에 링크 추가)

---

## 미확정 항목

| 항목 | 내용 | 우선순위 |
|---|---|---|
| Vendor 평가 항목 세부 정의 | 평가 점수 산식, 항목별 가중치 | 높음 |
| Item 분류 체계 | 품목 카테고리 코드 기준 | 높음 |
| Excel 템플릿 컬럼 구성 | Vendor / Item / 설계가별 각각 정의 필요 | 중간 |
| 파일 저장 방식 | 로컬 vs MinIO (샘플 단계는 로컬 우선) | 낮음 |
