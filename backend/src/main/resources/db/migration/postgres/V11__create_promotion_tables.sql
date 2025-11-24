CREATE TABLE promotion (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    discount_rate NUMERIC(5, 2),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'DRAFT',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE promotion_item (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER REFERENCES promotion(id) ON DELETE CASCADE,
    item_no VARCHAR(50) NOT NULL,
    item_name VARCHAR(255),
    stock_qty INTEGER,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotion_item_promotion_id ON promotion_item(promotion_id);
