-- Migration: 005_create_daily_planning_tables.sql
-- Daily priorities and daily intentions. Rows are dated, so previous days are always preserved.

-- 1. daily_priorities
-- The three-per-day limit is enforced by the API (inside a per-user locked transaction)
-- rather than a constraint, keeping the schema flexible.
CREATE TABLE IF NOT EXISTS daily_priorities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    priority_date DATE NOT NULL,
    title VARCHAR(250) NOT NULL,
    description TEXT,
    priority_order SMALLINT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_priorities_user_date ON daily_priorities(user_id, priority_date, priority_order);

-- 2. daily_intentions (one primary intention per user per day)
CREATE TABLE IF NOT EXISTS daily_intentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intention_date DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_daily_intentions_user_date UNIQUE (user_id, intention_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_intentions_user_date ON daily_intentions(user_id, intention_date);
