# Vendor Item DB — DB 정의서

| 항목 | 내용 |
|---|---|
| 스키마 | `bkt_vender_db` |
| DB 서버 | 172.16.0.10:9543 |
| DB명 | postgres |
| 기준일 | 2026-05-21 |
| DDL 파일 | `db-design/schema.sql` |

---

## 변경 이력

| 날짜 | 내용 |
|---|---|
| 2026-05-21 | 초안 작성 — 13개 테이블 + 2개 뷰 + 역할 권한 설정 |
| 2026-05-21 | item → equipment 용어 전체 변경 |
| 2026-05-21 | price_records → proposal_prices + design_prices 분리 (DB 권한 분리 목적) |
| 2026-05-21 | 단가 테이블에 vendor_id + equipment_id 직접 보유 + 복합 FK 적용 |
| 2026-05-21 | vendors.gwd_vendor_id / equipments.gwd_equipment_id 추가 (GWD 연결 대비) |
| 2026-05-21 | db-definition.md + table-definitions.md 통합 |
| 2026-05-21 | proposal_prices → design_prices(설계가), design_prices → execution_prices(실행가) 명칭 변경 |
| 2026-05-22 | 조회형 DB보다 업무 판단용 DB로 방향 재정리. 모델명/형번, 단가 정정, 평가 정정, 첨부 연결 보완 필요 사항 추가 |

---

## 1. 스키마 구조

```
bkt_vender_db
├── users                     사용자 계정 + 역할
├── vendors                   업체 마스터
├── equipment_categories      기자재 분류 계층 (대/중/소)
├── equipments                기자재 마스터
├── vendor_items              업체-기자재 취급 관계 (N:M)
├── design_prices             설계가 이력
├── execution_prices          실행가 이력 ★ 접근 제한
├── evaluation_criteria       평가 항목 마스터
├── vendor_evaluations        업체 평가 세션
├── evaluation_scores         평가 항목별 점수
├── attachments               파일 메타데이터
├── excel_uploads             업로드 이력
├── upload_error_rows         업로드 실패 행 상세
├── v_latest_design_prices    VIEW: 최신 설계가
└── v_latest_execution_prices VIEW: 최신 실행가 ★ 접근 제한
```

---

## 2. ER 관계 요약

```
[equipment_categories] (계층 자기참조)
         ↓
    [equipments]
         ↓
  [vendor_items] ←→ [vendors]
    ↙           ↘
[design_prices] [execution_prices]  ← 복합 FK (vendor_id + equipment_id)
                                        execution_prices는 DB 권한 분리 테이블

[vendors]
    ↓
[vendor_evaluations] ←→ [evaluation_criteria]
    ↓
[evaluation_scores]

[attachments] → ref_type + ref_id 로 vendors / evaluations / prices 등에 연결

[excel_uploads] ← [design_prices] / [execution_prices] / [upload_error_rows]
[users] ← 전 테이블 등록자/수정자 참조
```

---

## 3. 테이블 생성 순서 (FK 의존성)

```
1. users
2. vendors               → users
3. equipment_categories  → 자기참조
4. equipments            → equipment_categories, users
5. vendor_items          → vendors, equipments
6. excel_uploads         → users
7. design_prices         → vendor_items (복합 FK), users, excel_uploads
8. execution_prices      → vendor_items (복합 FK), users, excel_uploads
9. evaluation_criteria
10. vendor_evaluations   → vendors, users
11. evaluation_scores    → vendor_evaluations, evaluation_criteria
12. attachments          → users, excel_uploads
13. upload_error_rows    → excel_uploads
```

---

## 4. 핵심 설계 포인트

### 4-1. 설계가 / 실행가 테이블 분리

단가를 하나의 테이블로 관리하면 컬럼 단위 권한 제어가 앱 레벨에서만 가능합니다.
`design_prices`와 `execution_prices`를 별도 테이블로 분리해 **PostgreSQL GRANT/REVOKE로 테이블 자체를 차단**합니다.

| 역할 | design_prices | execution_prices |
|---|---|---|
| `role_admin` | SELECT / INSERT | SELECT / INSERT |
| `role_procurement` | SELECT / INSERT | SELECT / INSERT |
| `role_engineer` | SELECT | **접근 불가** |
| `role_viewer` | SELECT | **접근 불가** |

### 4-2. 복합 FK (단가 테이블)

`design_prices`와 `execution_prices`는 `vendor_id + equipment_id`를 직접 보유하고,
이 조합이 반드시 `vendor_items`에 존재함을 DB가 보장합니다.

```sql
FOREIGN KEY (vendor_id, equipment_id)
    REFERENCES vendor_items(vendor_id, equipment_id)
```

- 조회 시 JOIN 없이 vendor_id / equipment_id 바로 사용 가능
- `vendor_items`에 없는 업체-기자재 조합의 단가 등록 불가

### 4-3. 소프트 딜리트 (`is_active`)

`vendors`, `equipments`, `equipment_categories`, `vendor_items`에 `is_active` 컬럼 적용.
업체나 기자재를 비활성화해도 단가·평가 이력은 삭제되지 않고 보존됩니다.

### 4-4. 평가 항목 마스터 분리 (`evaluation_criteria`)

평가 항목과 가중치를 `evaluation_criteria` 테이블에서 관리합니다.
평가 기준이 바뀌어도 스키마 변경 없이 데이터만 수정하면 됩니다.

### 4-5. GWD 연결 대비

`vendors.gwd_vendor_id`, `equipments.gwd_equipment_id` 컬럼을 미리 확보했습니다.
GWD 연결 전까지 NULL로 유지하고, 연결 시점에 매핑 값을 채워 JOIN 기준으로 활용합니다.

| 테이블 | 매핑 컬럼 | 설명 |
|---|---|---|
| `vendors` | `gwd_vendor_id` | GWD 업체 ID — 연결 전까지 NULL |
| `equipments` | `gwd_equipment_id` | GWD 기자재 ID — 연결 전까지 NULL |

### 4-6. 업로드 오류 행 분리 (`upload_error_rows`)

업로드 실패 정보를 JSONB 하나에 몰아두지 않고 별도 테이블로 분리합니다.
Excel 행 번호(`row_no`) 기준으로 오류를 조회하거나 재처리할 때 편리합니다.

### 4-7. 업무 판단용 DB 보완 방향

이 DB는 단순 조회보다 업무 판단을 지원해야 합니다. 따라서 아래 판단 흐름을 DB가 뒷받침해야 합니다.

| 판단 질문 | 필요한 데이터 |
|---|---|
| 이 기자재/모델은 어느 업체가 공급하고 단가가 어떻게 변했는가? | 기자재, 업체-기자재 관계, 설계가/실행가 이력, 견적서 첨부 |
| 이 업체는 신뢰할 수 있는가? | 업체 기본정보, 평가 이력, 항목별 평가 점수, 평가 수정 이력 |
| 지금 처리해야 할 데이터 문제는 무엇인가? | 미등록 단가, 평가 누락, 오래된 평가, 업로드 실패, 출처 없는 단가 |

이에 따라 아래 보완을 검토합니다.

| 영역 | 보완안 | 상태 |
|---|---|---|
| 기자재 모델명 | `equipments.model_name` 또는 `manufacturer_model_no` 추가 검토 | 검토 필요 |
| 단가 정정 | 단가 테이블에 `updated_at`, `updated_by`, `is_voided`, `void_reason` 추가 검토 | 검토 필요 |
| 단가 근거 | 단가 행과 견적서 첨부파일의 직접 연결 강화 | 검토 필요 |
| 평가 정정 | `evaluation_scores`에도 수정자/수정일 또는 이력 테이블 검토 | 검토 필요 |
| 대시보드 집계 | 미등록/오류/오래된 데이터 식별용 뷰 추가 검토 | 검토 필요 |

---

## 5. 테이블 정의

### 5-1. `users` — 사용자 계정

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `user_id` | SERIAL | PK | 내부 식별자 (자동 증가) |
| `username` | VARCHAR(50) | UNIQUE NOT NULL | 로그인 ID |
| `email` | VARCHAR(200) | UNIQUE NOT NULL | 이메일 주소 |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt 해시 저장 — 평문 저장 금지 |
| `role` | VARCHAR(20) | NOT NULL | admin / procurement / engineer / viewer |
| `display_name` | VARCHAR(100) | | 화면 표시 이름 |
| `is_active` | BOOLEAN | DEFAULT TRUE | FALSE면 로그인 차단 |
| `last_login_at` | TIMESTAMPTZ | | 마지막 로그인 일시 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | 등록일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | 최종 수정일시 |

**역할별 테이블 접근 범위:**

| 역할 | vendors | equipments | design_prices | execution_prices | 입력/수정 |
|---|---|---|---|---|---|
| `admin` | O | O | O | O | 전체 |
| `procurement` | O | O | O | O | 업로드 가능 |
| `engineer` | O | O | O | **X (DB 차단)** | 불가 |
| `viewer` | O | O | O | **X (DB 차단)** | 불가 |

---

### 5-2. `vendors` — 업체 마스터

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `vendor_id` | SERIAL | PK | 내부 식별자 |
| `vendor_code` | VARCHAR(20) | UNIQUE NOT NULL | 업체 고유 코드 (채번 규칙 미확정) |
| `vendor_name` | VARCHAR(200) | NOT NULL | 업체명 |
| `vendor_type` | VARCHAR(20) | CHECK | 물품 / 공사 / 용역 / 기타 |
| `country` | VARCHAR(50) | | 국가 — 국산 / 수입 구분 용도 |
| `business_no` | VARCHAR(20) | | 사업자등록번호 |
| `contact_info` | JSONB | | 담당자명·전화·이메일 (유연한 확장용) |
| `financial_grade` | VARCHAR(20) | | 재무건전성 등급 (pass / non-pass) |
| `revenue` | BIGINT | | 매출액 (원) |
| `capital_size` | BIGINT | | 자본금 규모 (원) |
| `revenue_base_year` | INTEGER | | 매출액·자본금 기준연도 |
| `gwd_vendor_id` | VARCHAR(50) | UNIQUE NULL 가능 | GWD 업체 ID 매핑 — 연결 전 NULL |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | FALSE면 비활성 — 이력은 보존 |
| `notes` | TEXT | | 비고 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | 등록일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | 최종 수정일시 |
| `created_by` | INT | FK → users | 등록자 |
| `updated_by` | INT | FK → users | 최종 수정자 |

---

### 5-3. `equipment_categories` — 기자재 분류 계층

> 대분류 → 중분류 → 소분류 계층 구조. 전기설계 도메인 기자재 분류 기준에 맞춰 코드 체계 결정 필요.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `category_id` | SERIAL | PK | 내부 식별자 |
| `parent_category_id` | INT | FK → 자기참조 NULL 가능 | 최상위(대분류)이면 NULL |
| `category_code` | VARCHAR(20) | UNIQUE NOT NULL | 분류 코드 — 형식 미확정 |
| `category_name` | VARCHAR(100) | NOT NULL | 분류명 |
| `depth` | INTEGER | NOT NULL CHECK (1~4) | 계층 깊이 — 1=최상위(기계/배관/전기), 2=대분류, 3=중분류, 4=소분류 |
| `sort_order` | INTEGER | DEFAULT 0 | 같은 depth 내 화면 정렬 순서 |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | |

---

### 5-4. `equipments` — 기자재 마스터

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `equipment_id` | SERIAL | PK | 내부 식별자 |
| `category_id` | INT | FK → equipment_categories | 소분류 기준으로 연결 |
| `equipment_code` | VARCHAR(30) | UNIQUE NOT NULL | 기자재 코드 — 분류 코드 연동 여부 미확정 |
| `equipment_name` | VARCHAR(200) | NOT NULL | 기자재명 |
| `model_name` | VARCHAR(200) | 검토 컬럼 | 제조사 모델명 또는 화면 표시용 모델명. `equipment_name`과 분리 필요 시 추가 |
| `manufacturer_model_no` | VARCHAR(100) | 검토 컬럼 | 제조사 형번/모델번호. 실제 구매·견적 기준 식별자가 필요할 때 추가 |
| `specification` | TEXT | | 규격 — 단가 비교 기준으로 활용 |
| `unit` | VARCHAR(20) | | 단위 (EA / SET / M / kg 등) |
| `gwd_equipment_id` | VARCHAR(50) | UNIQUE NULL 가능 | GWD 기자재 ID 매핑 — 연결 전 NULL |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | FALSE면 비활성 — 이력 보존 |
| `notes` | TEXT | | 비고 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | 등록일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | 최종 수정일시 |
| `created_by` | INT | FK → users | 등록자 |
| `updated_by` | INT | FK → users | 최종 수정자 |

---

### 5-5. `vendor_items` — 업체-기자재 취급 관계 (N:M)

> 업체와 기자재는 다대다(N:M) 관계. 이 테이블이 관계의 원천이며,
> 단가 테이블은 이 테이블의 (vendor_id, equipment_id) 쌍을 복합 FK로 참조한다.
> 대리점(dealer)은 현 단계에서 텍스트로 관리. 향후 별도 테이블 분리 예정.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `vendor_item_id` | SERIAL | PK | 내부 식별자 |
| `vendor_id` | INT | FK → vendors NOT NULL | |
| `equipment_id` | INT | FK → equipments NOT NULL | |
| `dealer_name` | VARCHAR(200) | | 대리점명 — 현 단계 텍스트 관리, 2단계 분리 예정 |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | 현재 취급 여부 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

- UNIQUE (vendor_id, equipment_id) — 동일 업체-기자재 중복 방지 + 단가 테이블 복합 FK 기준

---

### 5-6. `design_prices` — 설계가 이력

> `price_date` 기준으로 이력이 누적되는 구조.
> vendor_id + equipment_id를 직접 보유하여 조회 편의성 확보.
> 복합 FK로 vendor_items에 존재하는 조합만 허용 — 데이터 정합성 보장.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `design_price_id` | UUID | PK DEFAULT gen_random_uuid() | 내부 식별자 |
| `vendor_id` | UUID | NOT NULL | 복합 FK 구성 요소 |
| `equipment_id` | UUID | NOT NULL | 복합 FK 구성 요소 |
| `price` | NUMERIC(15,2) | NOT NULL | 설계가 |
| `currency` | VARCHAR(3) | NOT NULL DEFAULT 'KRW' | 통화 코드 (KRW / USD 등) |
| `price_date` | DATE | NOT NULL | 단가 기준일 |
| `source` | VARCHAR(100) | | 출처 (견적서, Excel 업로드 등) |
| `upload_id` | UUID | FK → excel_uploads NULL 가능 | Excel 업로드 출처 — 수기 입력 시 NULL |
| `updated_at` | TIMESTAMPTZ | 검토 컬럼 | 오입력 정정 시 최종 수정일 |
| `updated_by` | UUID | 검토 컬럼 FK → users | 오입력 정정자 |
| `is_voided` | BOOLEAN | 검토 컬럼 DEFAULT FALSE | 단가 삭제 대신 무효 처리할 때 사용 |
| `void_reason` | TEXT | 검토 컬럼 | 무효 처리 사유 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| `created_by` | UUID | FK → users | 등록자 |

- FOREIGN KEY (vendor_id, equipment_id) REFERENCES vendor_items(vendor_id, equipment_id)

---

### 5-7. `execution_prices` — 실행가 이력

> **DB 권한 분리 테이블** — admin / procurement 역할만 SELECT 권한 부여.
> 앱 레벨이 아닌 PostgreSQL GRANT/REVOKE로 접근 자체를 차단한다.
> 구조는 design_prices와 동일하나 완전히 분리된 테이블로 운영.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `execution_price_id` | UUID | PK DEFAULT gen_random_uuid() | 내부 식별자 |
| `vendor_id` | UUID | NOT NULL | 복합 FK 구성 요소 |
| `equipment_id` | UUID | NOT NULL | 복합 FK 구성 요소 |
| `price` | NUMERIC(15,2) | NOT NULL | 실행가 |
| `currency` | VARCHAR(3) | NOT NULL DEFAULT 'KRW' | 통화 코드 (KRW / USD 등) |
| `price_date` | DATE | NOT NULL | 단가 기준일 |
| `source` | VARCHAR(100) | | 출처 |
| `upload_id` | UUID | FK → excel_uploads NULL 가능 | Excel 업로드 출처 — 수기 입력 시 NULL |
| `updated_at` | TIMESTAMPTZ | 검토 컬럼 | 오입력 정정 시 최종 수정일 |
| `updated_by` | UUID | 검토 컬럼 FK → users | 오입력 정정자 |
| `is_voided` | BOOLEAN | 검토 컬럼 DEFAULT FALSE | 단가 삭제 대신 무효 처리할 때 사용 |
| `void_reason` | TEXT | 검토 컬럼 | 무효 처리 사유 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| `created_by` | UUID | FK → users | 등록자 |

- FOREIGN KEY (vendor_id, equipment_id) REFERENCES vendor_items(vendor_id, equipment_id)

**DB 권한 설정:**

```sql
-- engineer / viewer 역할은 execution_prices 테이블 자체에 접근 불가
REVOKE ALL ON execution_prices FROM role_engineer;
REVOKE ALL ON execution_prices FROM role_viewer;
-- admin / procurement 역할만 허용
GRANT SELECT, INSERT ON execution_prices TO role_admin;
GRANT SELECT, INSERT ON execution_prices TO role_procurement;
```

---

### 5-8. `evaluation_criteria` — 평가 항목 마스터

> 평가 항목과 가중치를 DB에서 관리해, 기준 변경 시 스키마 수정 없이 대응.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `criteria_id` | SERIAL | PK | 내부 식별자 |
| `criteria_name` | VARCHAR(100) | NOT NULL | 평가 항목명 (재무건전성, 납기이행률 등) |
| `weight` | NUMERIC(5,2) | | 가중치 (%) — 전체 합계 100 권장 |
| `max_score` | INTEGER | NOT NULL | 항목 최고 점수 |
| `description` | TEXT | | 항목 설명 및 평가 기준 |
| `sort_order` | INTEGER | NOT NULL DEFAULT 0 | 화면 정렬 순서 |
| `is_active` | BOOLEAN | NOT NULL DEFAULT TRUE | |

---

### 5-9. `vendor_evaluations` — 업체 평가 세션

> 업체 1개당 평가 1회 = 1 row. 평가 항목별 점수는 evaluation_scores 테이블에 저장.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `evaluation_id` | SERIAL | PK | 내부 식별자 |
| `vendor_id` | INT | FK → vendors NOT NULL | |
| `evaluation_date` | DATE | NOT NULL | 평가 기준일 |
| `evaluator_id` | INT | FK → users | 평가자 |
| `total_score` | NUMERIC(5,2) | | 총점 — 항목별 가중 합산 결과 |
| `grade` | VARCHAR(10) | | 등급 (A / B / C / D 등 — 기준 미확정) |
| `notes` | TEXT | | 종합 의견 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| `updated_by` | INT | FK → users | 최종 수정자 |

---

### 5-10. `evaluation_scores` — 평가 세션별 항목 점수

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `score_id` | SERIAL | PK | 내부 식별자 |
| `evaluation_id` | INT | FK → vendor_evaluations NOT NULL | |
| `criteria_id` | INT | FK → evaluation_criteria NOT NULL | |
| `score` | NUMERIC(5,2) | NOT NULL | 항목별 점수 |
| `comment` | TEXT | | 항목별 코멘트 |
| `updated_at` | TIMESTAMPTZ | 검토 컬럼 | 항목 점수 수정일 |
| `updated_by` | INT | 검토 컬럼 FK → users | 항목 점수 수정자 |

- UNIQUE (evaluation_id, criteria_id) — 같은 평가 세션에서 같은 항목 중복 방지

---

### 5-11. `attachments` — 파일 메타데이터

> `ref_type + ref_id` 패턴으로 vendors, vendor_evaluations, design_prices, execution_prices 등
> 어디에든 파일 첨부 가능. 파일 실체는 MinIO에 저장, 이 테이블은 메타데이터만 관리.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `attachment_id` | SERIAL | PK | 내부 식별자 |
| `ref_type` | VARCHAR(30) | NOT NULL CHECK | 'vendor' / 'equipment' / 'evaluation' / 'design_price' / 'execution_price' |
| `ref_id` | INTEGER | NOT NULL | 대상 레코드의 PK |
| `file_name` | VARCHAR(300) | NOT NULL | 원본 파일명 |
| `storage_path` | VARCHAR(500) | NOT NULL | MinIO 경로 (형식 미확정) |
| `file_size` | BIGINT | | 파일 크기 (bytes) |
| `mime_type` | VARCHAR(100) | | 파일 타입 (application/pdf 등) |
| `upload_id` | INT | FK → excel_uploads NULL 가능 | 연결된 업로드 이력 |
| `uploaded_by` | INT | FK → users | 업로더 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

---

### 5-12. `excel_uploads` — 업로드 이력

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `upload_id` | SERIAL | PK | 내부 식별자 |
| `upload_type` | VARCHAR(20) | NOT NULL CHECK | 'vendor' / 'equipment' (기자재 파일에 설계가·실행가 포함) |
| `file_name` | VARCHAR(300) | NOT NULL | 업로드 파일명 |
| `uploaded_by` | INT | FK → users | 업로더 |
| `row_total` | INTEGER | | 전체 행 수 |
| `row_success` | INTEGER | | 성공 처리 행 수 |
| `row_fail` | INTEGER | | 실패 행 수 |
| `status` | VARCHAR(20) | CHECK | completed / partial / failed |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | 업로드 일시 |

---

### 5-13. `upload_error_rows` — 업로드 실패 행 상세

> 업로드 실패 정보를 JSONB 하나에 몰아넣으면 "어느 행이 왜 실패했나" 조회가 어려움.
> 실패 행을 별도 테이블로 관리해 행 번호 기준 필터링 및 재처리 대응 가능.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `error_row_id` | SERIAL | PK | 내부 식별자 |
| `upload_id` | INT | FK → excel_uploads NOT NULL | 상위 업로드 이력 |
| `row_no` | INTEGER | NOT NULL | Excel 행 번호 |
| `error_message` | TEXT | NOT NULL | 오류 내용 |
| `raw_data` | JSONB | | 실패한 행의 원본 데이터 |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

---

## 6. 뷰 정의

### `v_latest_design_prices` — 최신 설계가

업체-기자재별 가장 최근 `price_date`의 설계가를 반환합니다.

```sql
CREATE VIEW v_latest_design_prices AS
SELECT DISTINCT ON (vendor_id, equipment_id)
    vendor_id, equipment_id, price, currency, price_date, created_by
FROM design_prices
ORDER BY vendor_id, equipment_id, price_date DESC;
```

### `v_latest_execution_prices` — 최신 실행가

업체-기자재별 가장 최근 `price_date`의 실행가를 반환합니다.
`role_admin` / `role_procurement`만 조회 가능합니다.

```sql
CREATE VIEW v_latest_execution_prices AS
SELECT DISTINCT ON (vendor_id, equipment_id)
    vendor_id, equipment_id, price, currency, price_date, created_by
FROM execution_prices
ORDER BY vendor_id, equipment_id, price_date DESC;
```

---

## 7. 역할(Role) 및 권한

| 역할 | 대상 | 권한 |
|---|---|---|
| `role_admin` | 시스템 관리자 | 전체 테이블 SELECT / INSERT / UPDATE |
| `role_procurement` | 구매팀 | 전체 테이블 SELECT / INSERT (실행가 포함) |
| `role_engineer` | 설계 엔지니어 | execution_prices 제외 SELECT |
| `role_viewer` | 일반 조회자 | execution_prices 제외 SELECT |

> 실제 사용자 계정은 `users` 테이블에서 관리하고, `role` 컬럼으로 앱 레벨 접근 제어도 병행합니다.
> PostgreSQL 역할은 DB 직접 접근(DBeaver, psql 등)에 대한 추가 방어선입니다.

---

## 8. 미확정 항목

| 항목 | 내용 | 우선순위 |
|---|---|---|
| `vendor_code` 채번 규칙 | 자동 부여 vs 수동 입력, 형식 정의 | 높음 |
| `equipment_code` 채번 규칙 | 분류 코드 연동 여부 | 높음 |
| `equipment_categories` 분류 체계 | 대/중/소 기준, 코드 형식 | 높음 |
| `evaluation_criteria` 초기 항목 | 어떤 평가 항목을 기본값으로 넣을 것인지 | 중간 |
| `grade` 등급 체계 | A/B/C/D 기준 점수 구간 | 중간 |
| MinIO 경로 규칙 | `attachments.storage_path` 형식 | 낮음 |
| `gwd_*_id` 형식 | GWD ID 포맷 확인 후 VARCHAR 길이 조정 | 낮음 |
| 대리점 테이블 분리 | `vendor_items.dealer_name` → 별도 테이블 (2단계) | 낮음 |
