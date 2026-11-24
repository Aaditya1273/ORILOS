-- ORILOS Connect: claude.ai (and other MCP clients) sign in with OAuth 2.1 + PKCE to reach the account's computer.
-- Clients register themselves (RFC 7591). Codes and tokens are stored as hashes only.
CREATE TABLE oauth_clients (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL DEFAULT '',
  redirect_uris TEXT NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE oauth_codes (
  hash           TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri   TEXT NOT NULL,
  code_challenge TEXT NOT NULL,
  expires_at     INTEGER NOT NULL
);

CREATE TABLE oauth_tokens (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id       TEXT NOT NULL,
  access_hash     TEXT NOT NULL UNIQUE,
  refresh_hash    TEXT NOT NULL UNIQUE,
  access_expires  INTEGER NOT NULL,
  refresh_expires INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  used_at         INTEGER
);
CREATE INDEX oauth_tokens_user ON oauth_tokens(user_id);
