-- Migration: 003_create_dashboard_preferences_table.sql
-- Per-user Dashboard customization. Rows are created lazily on first update;
-- users without a row get default preferences from the API.

CREATE TABLE IF NOT EXISTS dashboard_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    visible_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
    widget_order JSONB NOT NULL DEFAULT '[]'::jsonb,
    default_period VARCHAR(20) NOT NULL DEFAULT 'week' CHECK (default_period IN ('day', 'week', 'month')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_user_id ON dashboard_preferences(user_id);
