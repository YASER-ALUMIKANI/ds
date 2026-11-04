CREATE TABLE quote_requests (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  source TEXT NOT NULL,
  language TEXT NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  screen_type TEXT,
  width REAL,
  height REAL,
  location TEXT,
  product TEXT,
  notes TEXT,
  source_url TEXT,
  client_hash TEXT NOT NULL,
  notification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (notification_status IN ('pending', 'sent', 'failed', 'skipped_local')),
  notification_attempts INTEGER NOT NULL DEFAULT 0,
  notification_provider_id TEXT,
  notification_error_code TEXT,
  notified_at TEXT
);

CREATE INDEX quote_requests_client_time
  ON quote_requests (client_hash, created_at);

CREATE INDEX quote_requests_notification
  ON quote_requests (notification_status, notification_attempts, created_at);

