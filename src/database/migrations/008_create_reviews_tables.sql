-- Migration: 008_create_reviews_tables.sql
-- Reviews module: parent reviews, daily/weekly/monthly detail tables, habit/task ratings, and review actions.

-- 1. reviews (parent table)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_type VARCHAR(20) NOT NULL CHECK (review_type IN ('daily', 'weekly', 'monthly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    rating SMALLINT CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10)),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT uq_reviews_user_type_period UNIQUE (user_id, review_type, period_start),
    CONSTRAINT chk_reviews_period CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_type ON reviews(user_id, review_type);
CREATE INDEX IF NOT EXISTS idx_reviews_user_status ON reviews(user_id, status);
CREATE INDEX IF NOT EXISTS idx_reviews_user_period ON reviews(user_id, period_start, period_end);

-- 2. daily_reviews (detail table)
CREATE TABLE IF NOT EXISTS daily_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,
    intention_snapshot TEXT,
    planned_vs_actual TEXT,
    what_went_well TEXT,
    what_got_in_the_way TEXT,
    reflections TEXT,
    money_reflection TEXT,
    tomorrow_focus TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_reviews_review_id ON daily_reviews(review_id);

-- 3. weekly_reviews (detail table)
CREATE TABLE IF NOT EXISTS weekly_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,
    wins TEXT,
    recurring_blockers TEXT,
    lessons TEXT,
    changes_next_week TEXT,
    money_reflection TEXT,
    next_week_focus TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_review_id ON weekly_reviews(review_id);

-- 4. monthly_reviews (detail table)
CREATE TABLE IF NOT EXISTS monthly_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL UNIQUE REFERENCES reviews(id) ON DELETE CASCADE,
    highlights TEXT,
    what_held_back TEXT,
    learnings TEXT,
    changes_next_month TEXT,
    money_reflection TEXT,
    next_month_focus TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monthly_reviews_review_id ON monthly_reviews(review_id);

-- 5. review_habit_ratings
CREATE TABLE IF NOT EXISTS review_habit_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 10),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_review_habit_ratings UNIQUE (review_id, habit_id)
);

CREATE INDEX IF NOT EXISTS idx_review_habit_ratings_review ON review_habit_ratings(review_id);
CREATE INDEX IF NOT EXISTS idx_review_habit_ratings_habit ON review_habit_ratings(habit_id);

-- 6. review_task_ratings
CREATE TABLE IF NOT EXISTS review_task_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 10),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_review_task_ratings UNIQUE (review_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_review_task_ratings_review ON review_task_ratings(review_id);
CREATE INDEX IF NOT EXISTS idx_review_task_ratings_task ON review_task_ratings(task_id);

-- 7. review_actions
CREATE TABLE IF NOT EXISTS review_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    title VARCHAR(250) NOT NULL,
    description TEXT,
    action_type VARCHAR(20) NOT NULL DEFAULT 'other' CHECK (action_type IN ('habit', 'task', 'personal', 'financial', 'learning', 'other')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'dismissed')),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_actions_user_status ON review_actions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_review_actions_review ON review_actions(review_id);
CREATE INDEX IF NOT EXISTS idx_review_actions_user_due_date ON review_actions(user_id, due_date);
