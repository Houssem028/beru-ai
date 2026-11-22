-- BERU ADMIN ENTERPRISE · additive migration 001
-- Apply only to the dedicated staging database first.
-- Do not run against production until the migration and API are reviewed.

ALTER TABLE admins ADD COLUMN display_name TEXT;
ALTER TABLE admins ADD COLUMN avatar_url TEXT;
ALTER TABLE admins ADD COLUMN last_seen_at TEXT;

UPDATE admins
SET display_name = COALESCE(NULLIF(display_name, ''), username)
WHERE display_name IS NULL OR display_name = '';

CREATE TABLE IF NOT EXISTS admin_departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  manager_admin_id INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(manager_admin_id) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS admin_chat_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  channel_type TEXT NOT NULL DEFAULT 'GENERAL'
    CHECK(channel_type IN ('GENERAL','EXECUTIVE','DEPARTMENT','PROJECT','SOCIAL')),
  department_id INTEGER,
  is_private INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(department_id) REFERENCES admin_departments(id),
  FOREIGN KEY(created_by) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS admin_chat_channel_members (
  channel_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  member_role TEXT NOT NULL DEFAULT 'MEMBER'
    CHECK(member_role IN ('OWNER','MODERATOR','MEMBER')),
  joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(channel_id, admin_id),
  FOREIGN KEY(channel_id) REFERENCES admin_chat_channels(id) ON DELETE CASCADE,
  FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  reply_to_id INTEGER,
  edited_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(channel_id) REFERENCES admin_chat_channels(id),
  FOREIGN KEY(admin_id) REFERENCES admins(id),
  FOREIGN KEY(reply_to_id) REFERENCES admin_chat_messages(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_chat_messages_channel
  ON admin_chat_messages(channel_id, id DESC);

CREATE TABLE IF NOT EXISTS admin_meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  agenda TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'GENERAL'
    CHECK(meeting_type IN ('GENERAL','EXECUTIVE','DEPARTMENT','SOCIAL','PROJECT')),
  status TEXT NOT NULL DEFAULT 'SCHEDULED'
    CHECK(status IN ('SCHEDULED','LIVE','COMPLETED','CANCELLED')),
  scheduled_at TEXT,
  started_at TEXT,
  ended_at TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(created_by) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS admin_meeting_attendees (
  meeting_id INTEGER NOT NULL,
  admin_id INTEGER NOT NULL,
  attendance_status TEXT NOT NULL DEFAULT 'INVITED'
    CHECK(attendance_status IN ('INVITED','ACCEPTED','DECLINED','ATTENDED','ABSENT')),
  PRIMARY KEY(meeting_id, admin_id),
  FOREIGN KEY(meeting_id) REFERENCES admin_meetings(id) ON DELETE CASCADE,
  FOREIGN KEY(admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_meeting_minutes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(meeting_id) REFERENCES admin_meetings(id) ON DELETE CASCADE,
  FOREIGN KEY(created_by) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS admin_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  department_id INTEGER,
  assigned_to INTEGER,
  created_by INTEGER NOT NULL,
  priority TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK(priority IN ('LOW','NORMAL','HIGH','URGENT')),
  status TEXT NOT NULL DEFAULT 'TODO'
    CHECK(status IN ('TODO','IN_PROGRESS','BLOCKED','DONE','CANCELLED')),
  due_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(department_id) REFERENCES admin_departments(id),
  FOREIGN KEY(assigned_to) REFERENCES admins(id),
  FOREIGN KEY(created_by) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_assignee
  ON admin_tasks(assigned_to, status, due_at);

CREATE TABLE IF NOT EXISTS social_platform_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL
    CHECK(platform IN ('FACEBOOK','INSTAGRAM','X','YOUTUBE','TIKTOK','LINKEDIN')),
  account_name TEXT NOT NULL,
  account_handle TEXT,
  external_account_id TEXT,
  connection_status TEXT NOT NULL DEFAULT 'NOT_CONNECTED'
    CHECK(connection_status IN ('NOT_CONNECTED','PENDING','CONNECTED','EXPIRED','ERROR')),
  access_token_ciphertext TEXT,
  refresh_token_ciphertext TEXT,
  token_expires_at TEXT,
  connected_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(connected_by) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_account_id INTEGER NOT NULL,
  title TEXT,
  body TEXT NOT NULL,
  media_manifest TEXT NOT NULL DEFAULT '[]',
  post_status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK(post_status IN ('DRAFT','IN_REVIEW','APPROVED','SCHEDULED','PUBLISHED','FAILED','CANCELLED')),
  scheduled_at TEXT,
  published_at TEXT,
  external_post_id TEXT,
  created_by INTEGER NOT NULL,
  updated_by INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(platform_account_id) REFERENCES social_platform_accounts(id),
  FOREIGN KEY(created_by) REFERENCES admins(id),
  FOREIGN KEY(updated_by) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS social_post_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  reviewer_admin_id INTEGER NOT NULL,
  decision TEXT NOT NULL CHECK(decision IN ('APPROVED','REJECTED','CHANGES_REQUESTED')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(post_id) REFERENCES social_posts(id) ON DELETE CASCADE,
  FOREIGN KEY(reviewer_admin_id) REFERENCES admins(id)
);

CREATE TABLE IF NOT EXISTS social_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform_account_id INTEGER,
  post_id INTEGER,
  actor_admin_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(platform_account_id) REFERENCES social_platform_accounts(id),
  FOREIGN KEY(post_id) REFERENCES social_posts(id),
  FOREIGN KEY(actor_admin_id) REFERENCES admins(id)
);

INSERT OR IGNORE INTO admin_departments(name, description) VALUES
 ('Executive','Leadership and strategic decisions'),
 ('Development','BERU AI product and engineering'),
 ('Finance','Budgets, subscriptions and BERU Coins'),
 ('Support','User support and community care'),
 ('Social Media','Official BERU social channels and content');

INSERT OR IGNORE INTO admin_chat_channels(slug,name,description,channel_type,is_private) VALUES
 ('general','General Meeting','Open team discussion for all authorized staff','GENERAL',0),
 ('executive','Executive Room','Private leadership coordination','EXECUTIVE',1),
 ('development','Development Room','Product, engineering and release discussions','DEPARTMENT',0),
 ('finance','Finance Room','Financial operations and coin economy','DEPARTMENT',1),
 ('social-media','Social Media Room','Content planning, reviews and social operations','SOCIAL',0);

CREATE INDEX IF NOT EXISTS idx_admin_meetings_schedule
  ON admin_meetings(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_schedule
  ON social_posts(post_status, scheduled_at);
