-- Register first-party AI/system agents separately from human admin login accounts.
CREATE TABLE IF NOT EXISTS admin_system_agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  rank_title TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','PAUSED','MAINTENANCE')),
  capabilities_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO admin_system_agents
(agent_key,display_name,rank_title,department,description,status,capabilities_json)
VALUES
('beru-digital-owner','BERU DIGITAL OWNER','AI Systems & Reliability Agent','Digital Operations',
 'Monitors connected BERU services, reviews health checks, prepares diagnostics and recommends fixes. Sensitive changes require explicit OWNER approval.',
 'ACTIVE',
 '["health.monitor","database.read_health","service.diagnostics","incident.reporting","repair.recommendations"]');
