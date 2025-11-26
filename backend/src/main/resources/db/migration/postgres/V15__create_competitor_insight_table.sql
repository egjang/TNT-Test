CREATE TABLE IF NOT EXISTS public.competitor_insight (
    insight_id bigserial NOT NULL,
    competitor_id int8 NOT NULL,
    product_id int8 NULL,
    insight_category_cd varchar(50) NOT NULL,
    insight_type_cd varchar(50) NULL,
    title varchar(200) NULL,
    description text NULL,
    impact_level_cd varchar(50) NULL,
    impact_analysis text NULL,
    region varchar(100) NULL,
    reporter_id varchar(50) NULL,
    "source" text NULL,
    evidence_url text NULL,
    attachment_url text NULL,
    event_date date NULL,
    detected_date date NULL,
    reported_at timestamptz NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by varchar(100) NULL,
    updated_by varchar(100) NULL,
    CONSTRAINT competitor_insight_pk PRIMARY KEY (insight_id)
);

CREATE INDEX IF NOT EXISTS idx_competitor_insight_competitor_id ON public.competitor_insight(competitor_id);
