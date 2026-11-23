-- Accounts, sessions, licence keys and billing state.
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  google_sub    TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL DEFAULT '',
  avatar        TEXT NOT NULL DEFAULT '',
  handle        TEXT UNIQUE,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  created_at    INTEGER NOT NULL,
  -- Billing, written only by the payment webhook.
  plan          TEXT NOT NULL DEFAULT 'free',
  sub_id        TEXT,
  sub_status    TEXT,
  sub_interval  TEXT,
  sub_renews_at INTEGER,
  sub_ends_at   INTEGER,
  customer_id   TEXT
);

-- Only a hash of each session token is stored.
CREATE TABLE sessions (
  id_hash    TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  seen_at    INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  agent      TEXT NOT NULL DEFAULT '',
  country    TEXT NOT NULL DEFAULT ''
);
CREATE INDEX sessions_user ON sessions(user_id);

-- Licence keys for the ORILOS app. Shown once; only the hash is kept.
CREATE TABLE licence_keys (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  prefix     TEXT NOT NULL,
  hash       TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  used_at    INTEGER,
  device     TEXT NOT NULL DEFAULT '',
  revoked_at INTEGER
);
CREATE INDEX licence_keys_user ON licence_keys(user_id);
