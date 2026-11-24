-- The 14-day refund is once per person, so it is keyed by the Google account and survives account deletion.
-- sub_id lets a retry finish a refund whose cancel step failed.
CREATE TABLE refunds (
  google_sub TEXT PRIMARY KEY,
  sub_id     TEXT NOT NULL,
  at         INTEGER NOT NULL
);
INSERT OR IGNORE INTO refunds (google_sub, sub_id, at) SELECT google_sub, COALESCE(sub_id, ''), refunded_at FROM users WHERE refunded_at IS NOT NULL;
