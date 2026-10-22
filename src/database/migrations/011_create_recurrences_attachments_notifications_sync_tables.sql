-- Migration: 011_create_recurrences_attachments_notifications_sync_tables.sql
-- Additional Functionality: Recurring Tasks, Attachments, Notifications, Synchronization, and Security Enhancements.

-- 1. Ensure composite unique constraints on parent entities for composite foreign keys
ALTER TABLE tasks ADD CONSTRAINT uq_tasks_id_user_id UNIQUE (id, user_id);
ALTER TABLE habits ADD CONSTRAINT uq_habits_id_user_id UNIQUE (id, user_id);

-- 2. task_recurrences
CREATE TABLE IF NOT EXISTS task_recurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly', 'custom')),
    weekdays JSONB NOT NULL DEFAULT '[]'::jsonb,
    interval_value INTEGER NOT NULL DEFAULT 1 CHECK (interval_value > 0),
    start_date DATE NOT NULL,
    end_date DATE,
    next_occurrence DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_task_recurrences_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT fk_task_recurrences_task_user FOREIGN KEY (task_id, user_id) REFERENCES tasks(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_task_recurrences_user ON task_recurrences(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_task_recurrences_task ON task_recurrences(task_id);
CREATE INDEX IF NOT EXISTS idx_task_recurrences_next ON task_recurrences(user_id, next_occurrence);

-- Link generated task occurrences back to their recurrence definition
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_id UUID REFERENCES task_recurrences(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_id ON tasks(recurrence_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tasks_recurrence_scheduled_date ON tasks(recurrence_id, scheduled_date) WHERE recurrence_id IS NOT NULL;

-- 3. user_attachments
CREATE TABLE IF NOT EXISTS user_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_attachments_user ON user_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_attachments_entity ON user_attachments(user_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_attachments_created ON user_attachments(user_id, created_at DESC);

-- 4. user_notifications
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON user_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON user_notifications(user_id, created_at DESC);

-- 5. notification_preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    reminder_preferences JSONB NOT NULL DEFAULT '{"habits": true, "tasks": true, "recurring_payments": true, "reviews": true}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- 6. user_devices
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    registration_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id, last_active_at DESC);

-- 7. user_sync_state
CREATE TABLE IF NOT EXISTS user_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES user_devices(id) ON DELETE CASCADE,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_server_version BIGINT NOT NULL DEFAULT 0,
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_sync_state_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_sync_state_user_device ON user_sync_state(user_id, device_id);

-- 8. user_sync_tombstones (for incremental deletion sync)
CREATE TABLE IF NOT EXISTS user_sync_tombstones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sync_tombstones_user_deleted ON user_sync_tombstones(user_id, deleted_at DESC);

-- 9. Section 4 Review: Missing indexes from table specifications
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expiry ON user_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_scheduled ON tasks(user_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, period);
