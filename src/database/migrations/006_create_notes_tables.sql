-- Migration: 006_create_notes_tables.sql
-- Notes and self-awareness: note categories, notes and note tags.

-- 1. note_categories
CREATE TABLE IF NOT EXISTS note_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_note_categories_user_id ON note_categories(user_id);

-- 2. notes
-- category_id links a note to one of the user's categories; deleting the category keeps the note.
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES note_categories(id) ON DELETE SET NULL,
    title VARCHAR(250) NOT NULL,
    content TEXT,
    note_type VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (note_type IN ('learning', 'reflection', 'observation', 'idea', 'journal', 'general')),
    source VARCHAR(150),
    occurred_at TIMESTAMPTZ,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(user_id, note_type);
CREATE INDEX IF NOT EXISTS idx_notes_category ON notes(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(user_id, archived_at);

-- 3. note_tags (tags are stored lowercase; one row per tag per note)
CREATE TABLE IF NOT EXISTS note_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_note_tags_note_tag UNIQUE (note_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_note_tags_user_tag ON note_tags(user_id, tag);
