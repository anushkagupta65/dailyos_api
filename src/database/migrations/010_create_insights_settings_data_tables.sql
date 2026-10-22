-- Migration: 010_create_insights_settings_data_tables.sql
-- Insights, Settings & Data Management module tables.

-- 1. insight_snapshots
CREATE TABLE IF NOT EXISTS insight_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('week', 'month', '90_days', 'year')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    insight_type VARCHAR(100) NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_insight_snapshots_dates CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_insight_snapshots_user_period ON insight_snapshots(user_id, period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_insight_snapshots_user_type ON insight_snapshots(user_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_insight_snapshots_generated_at ON insight_snapshots(user_id, generated_at DESC);

-- 2. user_insight_preferences
CREATE TABLE IF NOT EXISTS user_insight_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    default_period VARCHAR(20) NOT NULL DEFAULT 'week' CHECK (default_period IN ('week', 'month', '90_days', 'year')),
    default_filter VARCHAR(20) NOT NULL DEFAULT 'all',
    show_habits BOOLEAN NOT NULL DEFAULT TRUE,
    show_money BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_insight_preferences_user ON user_insight_preferences(user_id);

-- 3. user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(10) NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    accent_color VARCHAR(30) NOT NULL DEFAULT '#3B82F6',
    date_format VARCHAR(30) NOT NULL DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(10) NOT NULL DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
    timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
    week_starts_on SMALLINT NOT NULL DEFAULT 1 CHECK (week_starts_on IN (0, 1, 6)),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- 4. user_privacy_settings
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    analytics_consent BOOLEAN NOT NULL DEFAULT TRUE,
    personalization_consent BOOLEAN NOT NULL DEFAULT TRUE,
    health_data_consent BOOLEAN NOT NULL DEFAULT TRUE,
    data_export_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user ON user_privacy_settings(user_id);

-- 5. user_data_exports
CREATE TABLE IF NOT EXISTS user_data_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type VARCHAR(20) NOT NULL DEFAULT 'full' CHECK (export_type IN ('full', 'financial', 'habits', 'personal')),
    file_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'completed', 'failed', 'expired')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_data_exports_user ON user_data_exports(user_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_exports_status ON user_data_exports(user_id, status);

-- 6. user_data_imports
CREATE TABLE IF NOT EXISTS user_data_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    imported_at TIMESTAMPTZ,
    error_details JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_data_imports_user ON user_data_imports(user_id, imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_imports_status ON user_data_imports(user_id, status);
