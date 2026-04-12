-- Migration 023: Per-member notification preferences

ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS notif_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS notif_quiet_start INTEGER DEFAULT 22; -- hour (0-23)
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS notif_quiet_end INTEGER DEFAULT 9;   -- hour (0-23)
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS notif_morning_recap BOOLEAN DEFAULT TRUE;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS notif_morning_hour INTEGER DEFAULT 10;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS notif_night_recap BOOLEAN DEFAULT TRUE;
ALTER TABLE cockpit_members ADD COLUMN IF NOT EXISTS notif_night_hour INTEGER DEFAULT 20;

-- Migrate existing chat_id from cockpit_config to Alex's member record
UPDATE cockpit_members
SET telegram_chat_id = (SELECT value FROM cockpit_config WHERE key = 'telegram_chat_id' LIMIT 1)
WHERE email = 'alexwillemetz@gmail.com' AND telegram_chat_id IS NULL;
