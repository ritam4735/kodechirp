-- Migration 001: Add metadata, tags, and source to problems
ALTER TABLE problems ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'kodechirp';
ALTER TABLE problems ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE problems ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
