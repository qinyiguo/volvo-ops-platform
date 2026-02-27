-- ============================================================
-- Volvo 售後服務營運平台 - 資料庫 Schema
-- PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. users - 使用者管理
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(50) NOT NULL,
    role            VARCHAR(20) NOT NULL DEFAULT 'user',
    branch          VARCHAR(10),
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. staff_branch_map - 人員據點對照表
-- ============================================================
CREATE TABLE staff_branch_map (
    id              SERIAL PRIMARY KEY,
    staff_name      VARCHAR(50) NOT NULL,
    staff_code      VARCHAR(20),
    staff_type      VARCHAR(20) NOT NULL,
    branch          VARCHAR(10) NOT NULL,
    department      VARCHAR(20) DEFAULT '售服部',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_name, branch)
);

CREATE INDEX idx_staff_branch ON staff_branch_map(branch, staff_type);
CREATE INDEX idx_staff_name ON staff_branch_map(staff_name);

-- ============================================================
-- 3. parts_catalog - 零件對照表（去重）
-- ============================================================
CREATE TABLE parts_catalog (
    part_number     VARCHAR(30) PRIMARY KEY,
    part_name       VARCHAR(200),
    part_category   VARCHAR(50),
    function_code   VARCHAR(20),
    category_code   VARCHAR(20),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parts_category ON parts_catalog(category_code);
CREATE INDEX idx_parts_function ON parts_catalog(function_code);

-- ============================================================
-- 4. work_hour_master - 工時主檔
-- ============================================================
CREATE TABLE work_hour_master (
    work_code       VARCHAR(30) PRIMARY KEY,
    work_name       VARCHAR(200),
    standard_hours  NUMERIC(8,2),
    category_code   VARCHAR(20),
    category_name   VARCHAR(100),
    definition      VARCHAR(20),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. repair_income - 維修收入明細（三廠合併）
-- ============================================================
CREATE TABLE repair_income (
    id                  SERIAL PRIMARY KEY,
    period              VARCHAR(6) NOT NULL,
    branch              VARCHAR(10) NOT NULL,
    work_order          VARCHAR(30),
    settle_date         DATE,
    customer            VARCHAR(100),
    plate_no            VARCHAR(20),
    account_type_code   VARCHAR(10),
    account_type        VARCHAR(30),
    parts_income        NUMERIC(12,2) DEFAULT 0,
    accessories_income  NUMERIC(12,2) DEFAULT 0,
    boutique_income     NUMERIC(12,2) DEFAULT 0,
    engine_wage         NUMERIC(12,2) DEFAULT 0,
    bodywork_income     NUMERIC(12,2) DEFAULT 0,
    paint_income        NUMERIC(12,2) DEFAULT 0,
    carwash_income      NUMERIC(12,2) DEFAULT 0,
    outsource_income    NUMERIC(12,2) DEFAULT 0,
    addon_income        NUMERIC(12,2) DEFAULT 0,
    total_untaxed       NUMERIC(12,2) DEFAULT 0,
    total_taxed         NUMERIC(12,2) DEFAULT 0,
    parts_cost          NUMERIC(12,2) DEFAULT 0,
    service_advisor     VARCHAR(50),
    is_self_pay_bodywork BOOLEAN DEFAULT false,
    warranty_ext_flag   BOOLEAN DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_repair_period_branch ON repair_income(period, branch);
CREATE INDEX idx_repair_settle_date ON repair_income(settle_date);
CREATE INDEX idx_repair_sa ON repair_income(service_advisor);
CREATE INDEX idx_repair_account ON repair_income(account_type);

-- ============================================================
-- 6. tech_performance - 技師績效明細（三廠合併）
-- ============================================================
CREATE TABLE tech_performance (
    id              SERIAL PRIMARY KEY,
    period          VARCHAR(6) NOT NULL,
    branch          VARCHAR(10) NOT NULL,
    tech_name_raw   VARCHAR(50),
    tech_name_clean VARCHAR(50),
    dispatch_date   DATE,
    work_order      VARCHAR(30),
    work_code       VARCHAR(30),
    task_content    VARCHAR(200),
    standard_hours  NUMERIC(8,2) DEFAULT 0,
    wage            NUMERIC(12,2) DEFAULT 0,
    account_type    VARCHAR(30),
    discount        NUMERIC(5,2),
    wage_category   VARCHAR(30),
    is_beauty       BOOLEAN DEFAULT false,
    car_count_flag  INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tech_period_branch ON tech_performance(period, branch);
CREATE INDEX idx_tech_name ON tech_performance(tech_name_clean);
CREATE INDEX idx_tech_dispatch ON tech_performance(dispatch_date);

-- ============================================================
-- 7. parts_sales - 零件銷售明細（三廠合併）
-- ============================================================
CREATE TABLE parts_sales (
    id                  SERIAL PRIMARY KEY,
    period              VARCHAR(6) NOT NULL,
    branch              VARCHAR(10) NOT NULL,
    category            VARCHAR(20),
    category_detail     VARCHAR(50),
    order_no            VARCHAR(30),
    work_order          VARCHAR(30),
    part_number         VARCHAR(30),
    part_name           VARCHAR(200),
    part_type           VARCHAR(20),
    category_code       VARCHAR(20),
    function_code       VARCHAR(20),
    sale_qty            NUMERIC(10,2) DEFAULT 0,
    retail_price        NUMERIC(12,2) DEFAULT 0,
    sale_price_untaxed  NUMERIC(12,2) DEFAULT 0,
    cost_untaxed        NUMERIC(12,2) DEFAULT 0,
    discount_rate       NUMERIC(5,4),
    department          VARCHAR(20),
    pickup_person       VARCHAR(50),
    sales_person        VARCHAR(50),
    plate_no            VARCHAR(20),
    is_warranty_ext     BOOLEAN DEFAULT false,
    is_pirelli          BOOLEAN DEFAULT false,
    promo_bonus         NUMERIC(12,2) DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parts_period_branch ON parts_sales(period, branch);
CREATE INDEX idx_parts_number ON parts_sales(part_number);
CREATE INDEX idx_parts_cat_code ON parts_sales(category_code);
CREATE INDEX idx_parts_func_code ON parts_sales(function_code);
CREATE INDEX idx_parts_sales_person ON parts_sales(sales_person);

-- ============================================================
-- 8. business_query - 業務查詢（工單，含開單+結算兩個日期）
-- ============================================================
CREATE TABLE business_query (
    id              SERIAL PRIMARY KEY,
    period          VARCHAR(6) NOT NULL,
    branch          VARCHAR(10) NOT NULL,
    work_order      VARCHAR(30),
    open_time       TIMESTAMPTZ,
    settle_date     DATE,
    plate_no        VARCHAR(20),
    vin             VARCHAR(30),
    status          VARCHAR(20),
    repair_item     VARCHAR(200),
    service_advisor VARCHAR(50),
    assigned_tech   VARCHAR(50),
    repair_tech     VARCHAR(50),
    repair_type     VARCHAR(50),
    car_series      VARCHAR(50),
    car_model       VARCHAR(50),
    model_year      VARCHAR(10),
    owner           VARCHAR(100),
    is_ev           VARCHAR(10),
    mileage_in      INTEGER,
    mileage_out     INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bq_period_branch ON business_query(period, branch);
CREATE INDEX idx_bq_settle_date ON business_query(settle_date);
CREATE INDEX idx_bq_open_time ON business_query(open_time);
CREATE INDEX idx_bq_sa ON business_query(service_advisor);
CREATE INDEX idx_bq_repair_type ON business_query(repair_type);
CREATE INDEX idx_bq_is_ev ON business_query(is_ev);

-- ============================================================
-- 9. annual_targets - 年度目標
-- ============================================================
CREATE TABLE annual_targets (
    id              SERIAL PRIMARY KEY,
    year            INTEGER NOT NULL,
    branch          VARCHAR(10) NOT NULL,
    month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    metric_key      VARCHAR(50) NOT NULL,
    metric_name     VARCHAR(50) NOT NULL,
    target_value    NUMERIC(14,2) NOT NULL DEFAULT 0,
    updated_by      VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(year, branch, month, metric_key)
);

-- ============================================================
-- 10. monthly_weights - 月權重設定
-- ============================================================
CREATE TABLE monthly_weights (
    id              SERIAL PRIMARY KEY,
    year            INTEGER NOT NULL,
    branch          VARCHAR(10) NOT NULL,
    month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    weight          NUMERIC(5,3) NOT NULL DEFAULT 1.000,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(year, branch, month)
);

-- ============================================================
-- 11. staff_weights - 人員權重
-- ============================================================
CREATE TABLE staff_weights (
    id              SERIAL PRIMARY KEY,
    year            INTEGER NOT NULL,
    branch          VARCHAR(10) NOT NULL,
    staff_name      VARCHAR(50) NOT NULL,
    staff_type      VARCHAR(20) NOT NULL,
    weight          NUMERIC(6,2) NOT NULL DEFAULT 1.00,
    period_month    INTEGER CHECK (period_month BETWEEN 1 AND 12),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(year, branch, staff_name, staff_type, period_month)
);

-- ============================================================
-- 12. last_year_actuals - 去年實績
-- ============================================================
CREATE TABLE last_year_actuals (
    id              SERIAL PRIMARY KEY,
    year            INTEGER NOT NULL,
    branch          VARCHAR(10) NOT NULL,
    month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    metric_key      VARCHAR(50) NOT NULL,
    actual_value    NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(year, branch, month, metric_key)
);

-- ============================================================
-- 13. tracking_items - 追蹤品項設定（動態品項管理）
-- ============================================================
-- match_rules JSONB 範例：
--
-- 輪胎（零件類別）:
--   [{"data_source":"parts_sales","match_type":"category_code","category_code":"15"}]
--
-- 銀護噴霧（零件編號）:
--   [{"data_source":"parts_sales","match_type":"part_number","part_number":"7280011"}]
--
-- 電瓶（零件類別+功能碼）:
--   [{"data_source":"parts_sales","match_type":"both","category_code":"11","function_code":"7731"}]
--
-- 保養台數（業務查詢條件）:
--   [{"data_source":"business_query","match_type":"condition","condition_field":"repair_type","condition_value":"保養"}]
--
-- 電車台數（業務查詢條件）:
--   [{"data_source":"business_query","match_type":"condition","condition_field":"is_ev","condition_value":"電車"}]
--
-- 混合多條（OR 邏輯，符合任一即算）:
--   [
--     {"data_source":"parts_sales","match_type":"category_code","category_code":"15"},
--     {"data_source":"parts_sales","match_type":"part_number","part_number":"99887766"}
--   ]
--
CREATE TABLE tracking_items (
    id              SERIAL PRIMARY KEY,
    item_name       VARCHAR(100) NOT NULL,
    item_category   VARCHAR(20) NOT NULL DEFAULT '通用',
    count_method    VARCHAR(20) NOT NULL DEFAULT '數量',
    match_rules     JSONB NOT NULL DEFAULT '[]',
    -- 顯示在哪些報表（勾選）
    show_in_sa_summary      BOOLEAN NOT NULL DEFAULT false,
    show_in_tech_summary    BOOLEAN NOT NULL DEFAULT false,
    show_in_beauty          BOOLEAN NOT NULL DEFAULT false,
    show_in_bodywork        BOOLEAN NOT NULL DEFAULT false,
    show_in_branch_overview BOOLEAN NOT NULL DEFAULT false,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 14. promo_rules - 促銷獎金參數
-- ============================================================
CREATE TABLE promo_rules (
    id              SERIAL PRIMARY KEY,
    rule_name       VARCHAR(100) NOT NULL,
    applicable_types VARCHAR(50) NOT NULL,
    discount_min    NUMERIC(5,4),
    discount_max    NUMERIC(5,4),
    bonus_rate      NUMERIC(5,4) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    effective_from  DATE,
    effective_to    DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 15. upload_history - 上傳歷史紀錄
-- ============================================================
CREATE TABLE upload_history (
    id              SERIAL PRIMARY KEY,
    file_name       VARCHAR(255) NOT NULL,
    file_type       VARCHAR(50) NOT NULL,
    branch          VARCHAR(10),
    period          VARCHAR(6),
    row_count       INTEGER DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'success',
    error_message   TEXT,
    uploaded_by     VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- VIEW：個人目標分配計算
-- ============================================================
CREATE OR REPLACE VIEW v_individual_targets AS
SELECT
    at.year,
    at.branch,
    at.month,
    at.metric_key,
    at.metric_name,
    at.target_value AS branch_target,
    COALESCE(mw.weight, 1.000) AS monthly_weight,
    sw.staff_name,
    sw.staff_type,
    sw.weight AS staff_weight,
    SUM(sw.weight) OVER (
        PARTITION BY at.year, at.branch, at.month, at.metric_key, sw.staff_type
    ) AS total_weight,
    CASE
        WHEN SUM(sw.weight) OVER (
            PARTITION BY at.year, at.branch, at.month, at.metric_key, sw.staff_type
        ) > 0
        THEN ROUND(
            at.target_value * COALESCE(mw.weight, 1.000) * sw.weight
            / SUM(sw.weight) OVER (
                PARTITION BY at.year, at.branch, at.month, at.metric_key, sw.staff_type
            ), 2
        )
        ELSE 0
    END AS individual_target
FROM annual_targets at
JOIN staff_weights sw
    ON sw.year = at.year
    AND sw.branch = at.branch
    AND (sw.period_month = at.month OR sw.period_month IS NULL)
LEFT JOIN monthly_weights mw
    ON mw.year = at.year
    AND mw.branch = at.branch
    AND mw.month = at.month;

-- ============================================================
-- 初始資料
-- ============================================================
INSERT INTO users (username, password_hash, display_name, role, branch)
VALUES ('admin', '$2b$10$placeholder', '系統管理員', 'admin', NULL);

INSERT INTO promo_rules (rule_name, applicable_types, discount_min, discount_max, bonus_rate) VALUES
('配件高折扣', '配件', 0.0000, 0.7999, 0.05),
('配件低折扣', '配件', 0.8000, 0.9499, 0.03),
('配件極低折扣', '配件', 0.9500, 1.0000, 0.01),
('精品高折扣', '精品', 0.0000, 0.7999, 0.05),
('精品低折扣', '精品', 0.8000, 0.9499, 0.03),
('精品極低折扣', '精品', 0.9500, 1.0000, 0.01);
