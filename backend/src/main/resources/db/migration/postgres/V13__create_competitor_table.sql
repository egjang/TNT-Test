CREATE TABLE IF NOT EXISTS public.competitor (
    competitor_id bigserial NOT NULL,
    competitor_name varchar(200) NOT NULL,
    country varchar(100) NULL,
    homepage text NULL,
    founded_year int4 NULL,
    description text NULL,
    market_position_cd varchar(50) NULL,
    distribution_model varchar(100) NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by varchar(100) NULL,
    updated_by varchar(100) NULL,
    CONSTRAINT competitor_pk PRIMARY KEY (competitor_id)
);
