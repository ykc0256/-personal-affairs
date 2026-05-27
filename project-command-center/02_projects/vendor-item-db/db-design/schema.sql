-- =============================================================
-- Vendor Item DB — DDL
-- Schema  : bkt_vender_db
-- DB      : 172.16.0.10:9543
-- 기준일  : 2026-05-21
-- 비고    : 모든 PK UUID (gen_random_uuid())
-- 변경    : proposal_prices → design_prices(설계가), design_prices → execution_prices(실행가)
-- =============================================================

-- -------------------------------------------------------------
-- 0. 스키마 생성
-- -------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS bkt_vender_db;

SET search_path = bkt_vender_db;

-- -------------------------------------------------------------
-- 1. users — 사용자 계정
-- -------------------------------------------------------------
CREATE TABLE users (
    user_id       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50)   NOT NULL UNIQUE,
    email         VARCHAR(200)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          VARCHAR(20)   NOT NULL CHECK (role IN ('admin', 'procurement', 'engineer', 'viewer')),
    display_name  VARCHAR(100),
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 2. vendors — 업체 마스터
-- -------------------------------------------------------------
CREATE TABLE vendors (
    vendor_id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code        VARCHAR(20)   NOT NULL UNIQUE,
    vendor_name        VARCHAR(200)  NOT NULL,
    vendor_type        VARCHAR(20)   CHECK (vendor_type IN ('물품', '공사', '용역', '기타')),
    country            VARCHAR(50),
    business_no        VARCHAR(20),
    contact_info       JSONB,
    financial_grade    VARCHAR(20),
    revenue            BIGINT,
    capital_size       BIGINT,
    revenue_base_year  INTEGER,
    gwd_vendor_id      VARCHAR(50)   UNIQUE,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    notes              TEXT,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by         UUID          REFERENCES users(user_id),
    updated_by         UUID          REFERENCES users(user_id)
);

-- -------------------------------------------------------------
-- 3. equipment_categories — 기자재 분류 계층
-- -------------------------------------------------------------
CREATE TABLE equipment_categories (
    category_id        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_category_id UUID          REFERENCES equipment_categories(category_id),
    category_code      VARCHAR(20)   NOT NULL UNIQUE,
    category_name      VARCHAR(100)  NOT NULL,
    depth              INTEGER       NOT NULL CHECK (depth BETWEEN 1 AND 4),
    sort_order         INTEGER       NOT NULL DEFAULT 0,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE
);

-- -------------------------------------------------------------
-- 4. equipments — 기자재 마스터
-- -------------------------------------------------------------
CREATE TABLE equipments (
    equipment_id     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id      UUID          REFERENCES equipment_categories(category_id),
    equipment_code   VARCHAR(30)   NOT NULL UNIQUE,
    equipment_name   VARCHAR(200)  NOT NULL,
    specification    TEXT,
    unit             VARCHAR(20),
    gwd_equipment_id VARCHAR(50)   UNIQUE,
    is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
    notes            TEXT,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by       UUID          REFERENCES users(user_id),
    updated_by       UUID          REFERENCES users(user_id)
);

-- -------------------------------------------------------------
-- 5. vendor_items — 업체-기자재 취급 관계 (N:M)
-- -------------------------------------------------------------
CREATE TABLE vendor_items (
    vendor_item_id UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id      UUID          NOT NULL REFERENCES vendors(vendor_id),
    equipment_id   UUID          NOT NULL REFERENCES equipments(equipment_id),
    dealer_name    VARCHAR(200),
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    UNIQUE (vendor_id, equipment_id)
);

-- -------------------------------------------------------------
-- 6. excel_uploads — 업로드 이력
-- -------------------------------------------------------------
CREATE TABLE excel_uploads (
    upload_id    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_type  VARCHAR(20)  NOT NULL CHECK (upload_type IN ('vendor', 'equipment')),
    file_name    VARCHAR(300) NOT NULL,
    uploaded_by  UUID         REFERENCES users(user_id),
    row_total    INTEGER,
    row_success  INTEGER,
    row_fail     INTEGER,
    status       VARCHAR(20)  CHECK (status IN ('completed', 'partial', 'failed')),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 7. design_prices — 설계가 이력
-- -------------------------------------------------------------
CREATE TABLE design_prices (
    design_price_id UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID          NOT NULL,
    equipment_id    UUID          NOT NULL,
    price           NUMERIC(15,2) NOT NULL,
    currency        VARCHAR(3)    NOT NULL DEFAULT 'KRW',
    price_date      DATE          NOT NULL,
    source          VARCHAR(100),
    upload_id       UUID          REFERENCES excel_uploads(upload_id),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by      UUID          REFERENCES users(user_id),
    FOREIGN KEY (vendor_id, equipment_id) REFERENCES vendor_items(vendor_id, equipment_id)
);

-- -------------------------------------------------------------
-- 8. execution_prices — 실행가 이력 (접근 제한 테이블)
-- -------------------------------------------------------------
CREATE TABLE execution_prices (
    execution_price_id UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id          UUID          NOT NULL,
    equipment_id       UUID          NOT NULL,
    price              NUMERIC(15,2) NOT NULL,
    currency           VARCHAR(3)    NOT NULL DEFAULT 'KRW',
    price_date         DATE          NOT NULL,
    source             VARCHAR(100),
    upload_id          UUID          REFERENCES excel_uploads(upload_id),
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by         UUID          REFERENCES users(user_id),
    FOREIGN KEY (vendor_id, equipment_id) REFERENCES vendor_items(vendor_id, equipment_id)
);

-- -------------------------------------------------------------
-- 9. evaluation_criteria — 평가 항목 마스터
-- -------------------------------------------------------------
CREATE TABLE evaluation_criteria (
    criteria_id   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    criteria_name VARCHAR(100)  NOT NULL,
    weight        NUMERIC(5,2),
    max_score     INTEGER       NOT NULL,
    description   TEXT,
    sort_order    INTEGER       NOT NULL DEFAULT 0,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE
);

-- -------------------------------------------------------------
-- 10. vendor_evaluations — 업체 평가 세션
-- -------------------------------------------------------------
CREATE TABLE vendor_evaluations (
    evaluation_id   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID          NOT NULL REFERENCES vendors(vendor_id),
    evaluation_date DATE          NOT NULL,
    evaluator_id    UUID          REFERENCES users(user_id),
    total_score     NUMERIC(5,2),
    grade           VARCHAR(10),
    notes           TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_by      UUID          REFERENCES users(user_id)
);

-- -------------------------------------------------------------
-- 11. evaluation_scores — 평가 세션별 항목 점수
-- -------------------------------------------------------------
CREATE TABLE evaluation_scores (
    score_id      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID          NOT NULL REFERENCES vendor_evaluations(evaluation_id),
    criteria_id   UUID          NOT NULL REFERENCES evaluation_criteria(criteria_id),
    score         NUMERIC(5,2)  NOT NULL,
    comment       TEXT,
    UNIQUE (evaluation_id, criteria_id)
);

-- -------------------------------------------------------------
-- 12. attachments — 파일 메타데이터
-- -------------------------------------------------------------
CREATE TABLE attachments (
    attachment_id UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_type      VARCHAR(30)   NOT NULL CHECK (ref_type IN ('vendor', 'equipment', 'evaluation', 'design_price', 'execution_price')),
    ref_id        UUID          NOT NULL,
    file_name     VARCHAR(300)  NOT NULL,
    storage_path  VARCHAR(500)  NOT NULL,
    file_size     BIGINT,
    mime_type     VARCHAR(100),
    upload_id     UUID          REFERENCES excel_uploads(upload_id),
    uploaded_by   UUID          REFERENCES users(user_id),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- -------------------------------------------------------------
-- 13. upload_error_rows — 업로드 실패 행 상세
-- -------------------------------------------------------------
CREATE TABLE upload_error_rows (
    error_row_id  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id     UUID          NOT NULL REFERENCES excel_uploads(upload_id),
    row_no        INTEGER       NOT NULL,
    error_message TEXT          NOT NULL,
    raw_data      JSONB,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- =============================================================
-- VIEW 정의
-- =============================================================

CREATE VIEW v_latest_design_prices AS
SELECT DISTINCT ON (vendor_id, equipment_id)
    vendor_id, equipment_id, price, currency, price_date, created_by
FROM design_prices
ORDER BY vendor_id, equipment_id, price_date DESC;

CREATE VIEW v_latest_execution_prices AS
SELECT DISTINCT ON (vendor_id, equipment_id)
    vendor_id, equipment_id, price, currency, price_date, created_by
FROM execution_prices
ORDER BY vendor_id, equipment_id, price_date DESC;

-- =============================================================
-- ROLE 및 권한 설정
-- =============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'role_admin') THEN
        CREATE ROLE role_admin;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'role_procurement') THEN
        CREATE ROLE role_procurement;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'role_engineer') THEN
        CREATE ROLE role_engineer;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'role_viewer') THEN
        CREATE ROLE role_viewer;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA bkt_vender_db TO role_admin, role_procurement, role_engineer, role_viewer;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA bkt_vender_db TO role_admin;
GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA bkt_vender_db TO role_procurement;

GRANT SELECT ON
    vendors, equipments, equipment_categories,
    vendor_items, design_prices,
    vendor_evaluations, evaluation_criteria, evaluation_scores,
    attachments, excel_uploads
TO role_engineer, role_viewer;

REVOKE ALL ON execution_prices FROM role_engineer;
REVOKE ALL ON execution_prices FROM role_viewer;
