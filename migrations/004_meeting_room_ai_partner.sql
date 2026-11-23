-- BERU MEETING ROOM AI PARTNER · additive staging migration 004
-- Apply only to the dedicated staging database first.
-- Does not modify existing human admin accounts or chat messages.

CREATE TABLE IF NOT EXISTS admin_chat_ai_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  triggered_by_admin_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(channel_id) REFERENCES admin_chat_channels(id) ON DELETE CASCADE,
  FOREIGN KEY(triggered_by_admin_id) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_chat_ai_messages_channel
  ON admin_chat_ai_messages(channel_id, id DESC);

INSERT OR IGNORE INTO admin_system_agents
(agent_key,display_name,rank_title,department,description,status,capabilities_json)
VALUES
('chatgpt-meeting-partner','ChatGPT','AI Partner','BERU MEETING ROOM',
 'Responds when authorized staff mention @chatgpt in a room. Provides discussion support, analysis and meeting summaries; cannot act as a human admin or approve decisions.',
 'ACTIVE',
 '["meeting.assistance","discussion.support","summarization","action_item_drafting"]');
