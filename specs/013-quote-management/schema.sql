-- 1. ERP 참조 단가 마스터 (Daily Batch)
CREATE TABLE IF NOT EXISTS public.erp_ref_price (
    ref_id bigserial NOT NULL,
    base_date date NOT NULL,
    item_no varchar(50) NOT NULL, -- References public.item(item_no)
    assignee_id varchar(20) NOT NULL, -- References public.employee(assignee_id)
    
    individual_avg_price numeric(18, 0),
    sales_cost numeric(18, 0),
    tier_a_price numeric(18, 0),
    tier_b_price numeric(18, 0),
    tier_c_price numeric(18, 0),
    tier_d_price numeric(18, 0),
    tier_e_price numeric(18, 0),
    
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    CONSTRAINT erp_ref_price_pk PRIMARY KEY (ref_id)
);

-- 2. 프로젝트 마스터 (Project) [NEW]
-- 프로젝트 단위 견적 관리를 위한 상위 개념
CREATE TABLE IF NOT EXISTS public.project (
    project_id varchar(20) NOT NULL,
    project_name varchar(200) NOT NULL,
    company_type varchar(20) NOT NULL, -- TNT, DYS
    
    start_date date NULL,
    end_date date NULL,
    status_cd varchar(20) DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, CANCELLED
    
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by varchar(100) NULL,
    updated_by varchar(100) NULL,
    
    CONSTRAINT project_pk PRIMARY KEY (project_id)
);

-- 3. 견적 마스터 (Quote Header)
-- 변경: 프로젝트 연동 (Optional) 및 견적명 부활
CREATE TABLE IF NOT EXISTS public.quote (
    quote_id varchar(20) NOT NULL, -- 견적번호 (예: 20241011001)
    company_type varchar(20) NOT NULL, -- TNT, DYS
    quote_name varchar(200) NOT NULL, -- 견적명 (일반 견적 또는 프로젝트 견적의 제목)
    
    project_id varchar(20) NULL, -- References public.project (프로젝트 견적일 경우 필수 아님)
    assignee_id varchar(20) NOT NULL, -- References public.employee
    record_type_cd varchar(20) NOT NULL, -- TNT_DOUBLE, TNT_MAT, DYS_SEALANT
    
    status_cd varchar(20) DEFAULT 'DRAFT', 
    -- DRAFT, REQ_APPROVAL, APPROVED, NEGOTIATION, CONFIRMED, REJECTED
    
    approval_rule_cd varchar(20) NULL, -- AUTO, TIER_AB, LOSS
    
    -- 전체 합계 (모든 거래처 포함)
    total_amount numeric(18, 0) NULL,
    total_cost numeric(18, 0) NULL,
    expected_profit_rate numeric(5, 2) NULL,
    
    erp_sync_yn char(1) DEFAULT 'N',
    
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by varchar(100) NULL,
    updated_by varchar(100) NULL,
    
    CONSTRAINT quote_pk PRIMARY KEY (quote_id),
    CONSTRAINT quote_fk_project FOREIGN KEY (project_id) REFERENCES public.project(project_id)
);

-- 4. 견적 대상 거래처 (Quote Customer)
CREATE TABLE IF NOT EXISTS public.quote_customer (
    quote_customer_id bigserial NOT NULL,
    quote_id varchar(20) NOT NULL,
    account_id varchar(20) NOT NULL, -- 거래처 ID
    
    -- 거래처별 합계
    subtotal_amount numeric(18, 0) NULL,
    subtotal_cost numeric(18, 0) NULL,
    subtotal_profit_rate numeric(5, 2) NULL,
    
    remarks varchar(500) NULL,
    
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    CONSTRAINT quote_customer_pk PRIMARY KEY (quote_customer_id),
    CONSTRAINT quote_customer_fk_quote FOREIGN KEY (quote_id) REFERENCES public.quote(quote_id)
);

-- 5. 견적 상세 (Quote Line Item)
CREATE TABLE IF NOT EXISTS public.quote_item (
    item_id varchar(36) NOT NULL,
    quote_customer_id int8 NOT NULL, -- References public.quote_customer
    item_no varchar(50) NOT NULL, -- References public.item(item_no)
    
    quantity numeric(10, 2) NOT NULL,
    unit_price numeric(18, 0) NOT NULL,
    
    ref_tier_cd char(1) NULL, -- A, B, C, D, E
    ref_cost numeric(18, 0) NULL,
    ref_individual_avg numeric(18, 0) NULL,
    
    row_profit_rate numeric(5, 2) NULL,
    remarks varchar(200) NULL,
    
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    CONSTRAINT quote_item_pk PRIMARY KEY (item_id),
    CONSTRAINT quote_item_fk_customer FOREIGN KEY (quote_customer_id) REFERENCES public.quote_customer(quote_customer_id)
);

-- 6. 승인 이력 (Approval History)
CREATE TABLE IF NOT EXISTS public.quote_approval_history (
    history_id bigserial NOT NULL,
    quote_id varchar(20) NOT NULL,
    approver_id varchar(20) NOT NULL, -- References public.employee
    step_cd varchar(20) NULL, -- TEAM_LEADER, DEPT_HEAD, CEO
    action_type_cd varchar(10) NULL, -- APPROVE, REJECT
    comment_text varchar(500) NULL,
    action_date timestamptz DEFAULT now(),
    
    CONSTRAINT quote_approval_history_pk PRIMARY KEY (history_id)
);

-- 7. Slack 알림 로그 (Slack Integration Log)
CREATE TABLE IF NOT EXISTS public.quote_slack_log (
    log_id bigserial NOT NULL,
    quote_id varchar(20) NULL,
    target_user_id varchar(20) NULL, -- References public.employee
    message_type_cd varchar(50) NULL, -- APPROVAL_REQ, CONFIRMED, REJECTED
    slack_payload text NULL,
    sent_result_yn char(1) NULL,
    sent_at timestamptz DEFAULT now(),
    
    CONSTRAINT quote_slack_log_pk PRIMARY KEY (log_id)
);
