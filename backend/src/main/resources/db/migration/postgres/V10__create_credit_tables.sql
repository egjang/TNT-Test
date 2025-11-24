-- Create credit_meeting table
CREATE TABLE IF NOT EXISTS public.credit_meeting (
    id BIGSERIAL PRIMARY KEY,
    meeting_code VARCHAR(50),
    meeting_name VARCHAR(200),
    meeting_date DATE,
    meeting_status VARCHAR(20),
    remark TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create credit_meeting_customer table
CREATE TABLE IF NOT EXISTS public.credit_meeting_customer (
    id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT REFERENCES public.credit_meeting(id),
    customer_seq BIGINT,
    ar_aging_id BIGINT,
    snapshot_date DATE,
    decision_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create credit_sales_opinion table
CREATE TABLE IF NOT EXISTS public.credit_sales_opinion (
    id BIGSERIAL PRIMARY KEY,
    customer_seq BIGINT,
    assignee_id VARCHAR(50),
    opinion_type VARCHAR(50),
    opinion_text TEXT,
    promise_date DATE,
    promise_amount DECIMAL(19, 2),
    risk_level VARCHAR(20),
    meeting_customer_id BIGINT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create credit_unblock_request table
CREATE TABLE IF NOT EXISTS public.credit_unblock_request (
    id BIGSERIAL PRIMARY KEY,
    customer_seq BIGINT,
    request_code VARCHAR(50),
    request_date DATE,
    request_reason TEXT,
    assignee_id VARCHAR(50),
    request_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_meeting_date ON public.credit_meeting(meeting_date);
CREATE INDEX IF NOT EXISTS idx_credit_meeting_customer_meeting_id ON public.credit_meeting_customer(meeting_id);
CREATE INDEX IF NOT EXISTS idx_credit_sales_opinion_customer_seq ON public.credit_sales_opinion(customer_seq);
CREATE INDEX IF NOT EXISTS idx_credit_unblock_request_customer_seq ON public.credit_unblock_request(customer_seq);
