-- One self-serve refund per account (the 14-day refund on the first payment).
ALTER TABLE users ADD COLUMN refunded_at INTEGER;
