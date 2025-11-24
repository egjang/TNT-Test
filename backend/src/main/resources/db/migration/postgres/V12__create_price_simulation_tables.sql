-- Credit Rating Table
CREATE TABLE IF NOT EXISTS credit_rating (
    id BIGSERIAL PRIMARY KEY,
    customer_seq BIGINT NOT NULL,
    rating_agency VARCHAR(50), -- e.g., 'NICE', 'KED'
    rating_grade VARCHAR(10),  -- e.g., 'A', 'B+', 'CCC'
    rating_score INTEGER,      -- Normalized score 0-100
    rating_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_rating_customer ON credit_rating(customer_seq);

-- Sales Rep Assessment Table
CREATE TABLE IF NOT EXISTS sales_rep_assessment (
    id BIGSERIAL PRIMARY KEY,
    customer_seq BIGINT NOT NULL,
    assessor_id VARCHAR(50),
    assessment_score INTEGER, -- 1-5 scale or 0-100
    assessment_comment TEXT,
    assessment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_rep_assessment_customer ON sales_rep_assessment(customer_seq);
