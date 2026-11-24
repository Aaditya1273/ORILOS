-- Each licence key works on one computer: the first one that checks it.
ALTER TABLE licence_keys ADD COLUMN device_id TEXT;
