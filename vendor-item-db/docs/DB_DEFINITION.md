# DB 정의서

현재 DB 모델은 `prisma/schema.prisma`의 `bkt_vender_db` 스키마를 기준으로 정리합니다.

## 설계 원칙

- 마스터 테이블은 화면 운영의 기준 정보입니다.
- 이력 테이블은 과거 데이터를 보존합니다.
- 삭제는 기본적으로 물리 삭제가 아니라 `is_active=false` 또는 `is_voided=true`로 처리합니다.
- Excel 업로드와 화면 수동 입력은 같은 DB 제약과 검증 규칙을 사용해야 합니다.
- 코드 컬럼은 외부 연동, 업로드 검증, 검색, 자동 제안의 기준이 됩니다.

## 핵심 관계

```text
equipment_categories 1 - N equipments
equipments N - N vendors
  via vendor_items
vendor_items 1 - N design_prices
vendor_items 1 - N execution_prices
vendors 1 - N vendor_evaluations
vendor_evaluations 1 - N evaluation_scores
excel_uploads 1 - N upload_error_rows
excel_uploads 1 - N attachments
```

## 마스터 테이블

### equipment_categories

기자재 분류 계층과 분류 코드를 관리합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| category_id | uuid PK | 분류 ID |
| parent_category_id | uuid nullable | 상위 분류 ID |
| category_code | varchar(20) unique | 분류 코드 |
| category_name | varchar(100) | 분류명 |
| depth | int | 분류 깊이 |
| sort_order | int | 표시 순서 |
| is_active | boolean | 활성 여부 |

운영 규칙:

- 기자재 추가/수정 시 활성 분류만 선택합니다.
- 분류 삭제는 비활성화로 처리합니다.
- 분류 코드는 기자재 코드 자동 제안과 Excel 업로드 검증의 기준이 될 수 있습니다.
- 화면에는 분류명뿐 아니라 분류 코드와 전체 경로를 함께 표시해야 합니다.

### equipments

기자재 마스터입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| equipment_id | uuid PK | 기자재 ID |
| category_id | uuid nullable | 분류 ID |
| equipment_code | varchar(30) unique | 기자재 코드 |
| equipment_name | varchar(200) | 기자재명 |
| model_name | varchar(200) nullable | 모델명 |
| manufacturer_model_no | varchar(100) nullable | 제조사 모델번호 |
| specification | text nullable | 규격/사양 |
| unit | varchar(20) nullable | 단위 |
| gwd_equipment_id | varchar(50) unique nullable | GWD 기자재 ID |
| is_active | boolean | 활성 여부 |
| notes | text nullable | 비고 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |
| created_by | uuid nullable | 생성 사용자 |
| updated_by | uuid nullable | 수정 사용자 |

운영 규칙:

- `equipment_code`는 필수이며 중복될 수 없습니다.
- `gwd_equipment_id`는 선택값이지만 입력된 경우 중복될 수 없습니다.
- 기자재 삭제는 `is_active=false`로 처리합니다.
- 기존 가격 이력이나 업체 연결이 있는 기자재는 물리 삭제하지 않습니다.

### vendors

업체 마스터입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| vendor_id | uuid PK | 업체 ID |
| vendor_code | varchar(20) unique | 업체 코드 |
| vendor_name | varchar(200) | 업체명 |
| vendor_type | varchar(20) nullable | 업체 유형 |
| country | varchar(50) nullable | 국가 |
| business_no | varchar(20) nullable | 사업자번호 |
| contact_info | json nullable | 연락처 정보 |
| financial_grade | varchar(20) nullable | 재무 등급 |
| revenue | bigint nullable | 매출 |
| capital_size | bigint nullable | 자본금 |
| revenue_base_year | int nullable | 매출 기준 연도 |
| gwd_vendor_id | varchar(50) unique nullable | GWD 업체 ID |
| is_active | boolean | 활성 여부 |
| notes | text nullable | 비고 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |
| created_by | uuid nullable | 생성 사용자 |
| updated_by | uuid nullable | 수정 사용자 |

운영 규칙:

- `vendor_code`는 필수이며 중복될 수 없습니다.
- `gwd_vendor_id`는 선택값이지만 입력된 경우 중복될 수 없습니다.
- 업체 삭제는 `is_active=false`로 처리합니다.
- 비활성 업체는 신규 가격 등록과 신규 업체-기자재 연결에서 제외합니다.

### vendor_items

업체와 기자재의 취급 관계를 저장합니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| vendor_item_id | uuid PK | 업체-기자재 연결 ID |
| vendor_id | uuid | 업체 ID |
| equipment_id | uuid | 기자재 ID |
| dealer_name | varchar(200) nullable | 대리점명 |
| is_active | boolean | 활성 여부 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |

제약:

- `vendor_id`, `equipment_id` 조합은 unique입니다.

운영 규칙:

- 업체-기자재 연결 삭제는 `is_active=false`로 처리합니다.
- 가격 이력은 연결 관계를 전제로 저장합니다.
- 연결이 비활성화되어도 기존 가격 이력은 보존합니다.

## 이력 테이블

### design_prices

설계가 이력입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| design_price_id | uuid PK | 설계가 ID |
| vendor_id | uuid | 업체 ID |
| equipment_id | uuid | 기자재 ID |
| price | decimal(15,2) | 금액 |
| currency | varchar(3) | 통화, 기본 KRW |
| price_date | date | 기준일 |
| source | varchar(100) nullable | 출처 |
| note | text nullable | 비고 |
| upload_id | uuid nullable | 업로드 ID |
| is_voided | boolean | 확정 제외 여부 |
| void_reason | text nullable | 확정 제외 사유 |
| created_at | timestamptz | 생성 시각 |
| created_by | uuid nullable | 생성 사용자 |
| updated_at | timestamptz nullable | 수정 시각 |
| updated_by | uuid nullable | 수정 사용자 |

운영 규칙:

- 가격 변경은 기존 행 수정이 아니라 신규 이력 추가가 기본입니다.
- 잘못 입력된 가격은 `is_voided=true`로 확정 제외합니다.
- 최신 가격 계산에서는 확정 제외 이력을 제외합니다.

### execution_prices

실행가 이력입니다. 구조와 운영 규칙은 `design_prices`와 동일합니다.

추가 권한 규칙:

- 실행가 조회와 관리는 `admin`, `procurement`만 가능합니다.

### vendor_evaluations

업체 평가 헤더입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| evaluation_id | uuid PK | 평가 ID |
| vendor_id | uuid | 업체 ID |
| evaluation_date | date | 평가일 |
| evaluator_id | uuid nullable | 평가자 |
| total_score | decimal(5,2) nullable | 총점 |
| grade | varchar(10) nullable | 등급 |
| notes | text nullable | 비고 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |
| updated_by | uuid nullable | 수정 사용자 |

### evaluation_criteria

평가 기준 마스터입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| criteria_id | uuid PK | 평가 기준 ID |
| criteria_name | varchar(100) | 기준명 |
| weight | decimal(5,2) nullable | 가중치 |
| max_score | int | 최대 점수 |
| description | text nullable | 설명 |
| sort_order | int | 표시 순서 |
| is_active | boolean | 활성 여부 |

운영 규칙:

- 신규 평가 입력은 활성 평가 기준만 사용합니다.
- 기존 평가 이력은 기준이 비활성화되어도 보존합니다.

### evaluation_scores

평가 기준별 점수입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| score_id | uuid PK | 점수 ID |
| evaluation_id | uuid | 평가 ID |
| criteria_id | uuid | 평가 기준 ID |
| score | decimal(5,2) | 점수 |
| comment | text nullable | 코멘트 |
| updated_at | timestamptz nullable | 수정 시각 |
| updated_by | uuid nullable | 수정 사용자 |

제약:

- `evaluation_id`, `criteria_id` 조합은 unique입니다.

## 사용자와 권한

### users

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| user_id | uuid PK | 사용자 ID |
| username | varchar(50) unique | 로그인 ID |
| email | varchar(200) unique | 이메일 |
| password_hash | varchar(255) | 비밀번호 해시 |
| role | varchar(20) | 역할 |
| display_name | varchar(100) nullable | 표시명 |
| is_active | boolean | 활성 여부 |
| last_login_at | timestamptz nullable | 마지막 로그인 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 |

현재 역할:

- `admin`: 마스터 구조와 전체 관리
- `procurement`: 가격과 실행가 관리
- 일반 사용자: 조회 중심

## 업로드와 첨부

### excel_uploads

Excel 업로드 실행 단위입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| upload_id | uuid PK | 업로드 ID |
| upload_type | varchar(20) | 업로드 유형 |
| file_name | varchar(300) | 파일명 |
| uploaded_by | uuid nullable | 업로드 사용자 |
| row_total | int nullable | 전체 행 수 |
| row_success | int nullable | 성공 행 수 |
| row_fail | int nullable | 실패 행 수 |
| status | varchar(20) nullable | 상태 |
| created_at | timestamptz | 생성 시각 |

### upload_error_rows

업로드 실패 행입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| error_row_id | uuid PK | 오류 행 ID |
| upload_id | uuid | 업로드 ID |
| row_no | int | 행 번호 |
| error_message | text | 오류 메시지 |
| raw_data | json nullable | 원본 행 데이터 |
| created_at | timestamptz | 생성 시각 |

### attachments

첨부 파일 메타데이터입니다.

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| attachment_id | uuid PK | 첨부 ID |
| ref_type | varchar(30) | 참조 유형 |
| ref_id | uuid | 참조 ID |
| file_name | varchar(300) | 파일명 |
| storage_path | varchar(500) | 저장 경로 |
| file_size | bigint nullable | 파일 크기 |
| mime_type | varchar(100) nullable | MIME 타입 |
| upload_id | uuid nullable | 업로드 ID |
| uploaded_by | uuid nullable | 업로드 사용자 |
| created_at | timestamptz | 생성 시각 |

## 공통 검증 규칙 후보

- 신규 등록은 활성 마스터만 참조합니다.
- 코드 컬럼은 trim 후 저장합니다.
- unique 컬럼 중복은 사용자에게 명확한 메시지로 반환합니다.
- 비활성 데이터는 기본 조회에서 제외하고, 관리자 필터에서 별도로 조회합니다.
- 업로드 데이터는 화면 입력과 동일한 필수값/중복/참조 검증을 통과해야 반영합니다.
