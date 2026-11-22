-- BERU DIGITAL OWNER diagnostic history.
-- Additive migration: does not alter existing application records.
CREATE TABLE IF NOT EXISTS digital_monitor_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checked_by INTEGER,
  check_name TEXT NOT NULL,
  check_group TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  latency_ms INTEGER,
  FOREIGN KEY (checked_by) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_digital_monitor_checks_checked_at
  ON digital_monitor_checks(checked_at DESC);
