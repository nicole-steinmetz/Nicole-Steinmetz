-- Project briefs. Apply to the D1 database bound as BRIEFS_DB.
-- The resume credential is never stored. token_hash is SHA-256 hex.

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  schema_version INTEGER NOT NULL,
  step INTEGER NOT NULL,
  answers_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  submission_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drafts_expires ON drafts (expires_at);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  draft_id TEXT,
  schema_version INTEGER NOT NULL,
  answers_json TEXT NOT NULL,
  summary_text TEXT NOT NULL,
  email_status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions (created_at);
