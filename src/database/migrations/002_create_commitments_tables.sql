-- Migration: 002_create_commitments_tables.sql
-- Commitments module: habit categories, habits, schedules, logs, flexibility and reminders.

-- 1. habit_categories
-- System categories have user_id = NULL and is_system = TRUE.
CREATE TABLE IF NOT EXISTS habit_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(20),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_habit_categories_owner CHECK (
        (is_system = TRUE AND user_id IS NULL) OR (is_system = FALSE AND user_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_habit_categories_user_id ON habit_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_categories_is_system ON habit_categories(is_system);

-- 2. habits
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES habit_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(20),
    habit_type VARCHAR(20) NOT NULL DEFAULT 'positive' CHECK (habit_type IN ('positive', 'avoid')),
    tracking_type VARCHAR(20) NOT NULL DEFAULT 'boolean' CHECK (tracking_type IN ('boolean', 'count', 'duration', 'quantity')),
    target_value DECIMAL(10,2),
    target_unit VARCHAR(30),
    frequency_type VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (frequency_type IN ('daily', 'weekly', 'custom')),
    start_date DATE NOT NULL,
    end_date DATE,
    preferred_time TIME,
    cue TEXT,
    difficulty VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived', 'completed')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_habits_date_range CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_status ON habits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_habits_category ON habits(user_id, category_id);

-- 3. habit_schedules
-- A habit may have several non-overlapping schedules over time (effective_from / effective_until),
-- so past progress is always evaluated against the schedule that applied at the time.
CREATE TABLE IF NOT EXISTS habit_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily', 'selected_days', 'interval')),
    weekdays JSONB NOT NULL DEFAULT '[]'::jsonb,
    interval_days INTEGER CHECK (interval_days IS NULL OR interval_days >= 1),
    effective_from DATE NOT NULL,
    effective_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_habit_schedules_date_range CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE INDEX IF NOT EXISTS idx_habit_schedules_habit_id ON habit_schedules(habit_id, effective_from);
CREATE INDEX IF NOT EXISTS idx_habit_schedules_user_id ON habit_schedules(user_id);

-- 4. habit_logs
CREATE TABLE IF NOT EXISTS habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('completed', 'skipped', 'missed', 'partial')),
    actual_value DECIMAL(10,2),
    notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_habit_logs_user_habit_date UNIQUE (user_id, habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON habit_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date ON habit_logs(habit_id, log_date);

-- 5. habit_flexibility (one row per habit)
CREATE TABLE IF NOT EXISTS habit_flexibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL UNIQUE REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    minimum_version TEXT,
    normal_version TEXT,
    ideal_version TEXT,
    alternative_action TEXT,
    recovery_rule TEXT,
    never_miss_twice BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habit_flexibility_user_id ON habit_flexibility(user_id);

-- 6. habit_reminders
-- Storage/configuration only; delivery is handled separately. Defaults to gentle in-app reminders.
CREATE TABLE IF NOT EXISTS habit_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    reminder_type VARCHAR(20) NOT NULL DEFAULT 'in_app' CHECK (reminder_type IN ('in_app', 'push', 'email')),
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habit_reminders_habit_id ON habit_reminders(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_reminders_user_id ON habit_reminders(user_id, is_enabled);

-- 7. Default system categories (idempotent)
INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Fitness', 'Exercise, workouts and physical activity', 'dumbbell', '#EF4444', TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Fitness');

INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Health', 'Nutrition, hydration and general wellbeing', 'heart', '#10B981', TRUE, 2
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Health');

INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Sleep', 'Sleep schedule and rest', 'moon', '#6366F1', TRUE, 3
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Sleep');

INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Mindfulness', 'Meditation, journaling and reflection', 'lotus', '#8B5CF6', TRUE, 4
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Mindfulness');

INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Reading', 'Books, articles and reading time', 'book', '#F59E0B', TRUE, 5
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Reading');

INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Learning', 'Courses, skills and study', 'graduation-cap', '#3B82F6', TRUE, 6
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Learning');

INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Career', 'Professional growth and work routines', 'briefcase', '#0EA5E9', TRUE, 7
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Career');

INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Personal', 'Personal routines and relationships', 'user', '#EC4899', TRUE, 8
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Personal');

INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Finance', 'Saving, budgeting and money habits', 'wallet', '#22C55E', TRUE, 9
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Finance');

INSERT INTO habit_categories (user_id, name, description, icon, color, is_system, sort_order)
SELECT NULL, 'Other', 'Anything else', 'sparkles', '#64748B', TRUE, 10
WHERE NOT EXISTS (SELECT 1 FROM habit_categories WHERE is_system = TRUE AND name = 'Other');
