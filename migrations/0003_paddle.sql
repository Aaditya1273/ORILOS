-- Paddle can deliver webhooks out of order: keep the newest subscription state only.
ALTER TABLE users ADD COLUMN sub_event_at TEXT;
