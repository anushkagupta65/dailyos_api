-- Migration: 007_create_learning_tables.sql
-- Learning management: learning entries and their review history.

-- 1. learning_entries
CREATE TABLE IF NOT EXISTS learning_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(250) NOT NULL,
    content TEXT,
    key_takeaway TEXT,
    category VARCHAR(100),
    source VARCHAR(250),
    learned_at DATE NOT NULL,
    review_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_entries_user_id ON learning_entries(user_id, learned_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_entries_review_date ON learning_entries(user_id, review_date);

-- 2. learning_reviews (append-only history; each review is its own row)
CREATE TABLE IF NOT EXISTS learning_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learning_id UUID NOT NULL REFERENCES learning_entries(id) ON DELETE CASCADE,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reflection TEXT,
    understanding_level SMALLINT CHECK (understanding_level IS NULL OR (understanding_level >= 1 AND understanding_level <= 5)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_reviews_learning_id ON learning_reviews(learning_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_reviews_user_id ON learning_reviews(user_id);
