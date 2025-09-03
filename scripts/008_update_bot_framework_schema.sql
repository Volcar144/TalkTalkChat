-- Update bot framework tables to match existing schema
-- Drop existing tables if they exist with different structure
DROP TABLE IF EXISTS bot_analytics CASCADE;
DROP TABLE IF EXISTS bot_installations CASCADE;
DROP TABLE IF EXISTS bot_webhooks CASCADE;
DROP TABLE IF EXISTS bot_commands CASCADE;
DROP TABLE IF EXISTS bots CASCADE;

-- Recreate bots table to match existing schema
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  user_id UUID, -- Keep existing column
  token TEXT UNIQUE NOT NULL,
  public BOOLEAN DEFAULT false, -- Match existing column name
  verified BOOLEAN DEFAULT false, -- Match existing column name
  commands JSONB DEFAULT '{}', -- Match existing column
  permissions BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate bot_commands table to match existing schema
CREATE TABLE IF NOT EXISTS bot_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  permissions BIGINT DEFAULT 0, -- Match existing column
  options JSONB DEFAULT '{}', -- Match existing column
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, name)
);

-- Create missing tables
CREATE TABLE IF NOT EXISTS bot_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  installed_by UUID NOT NULL,
  permissions BIGINT DEFAULT 0,
  custom_prefix TEXT,
  enabled_commands TEXT[] DEFAULT '{}',
  disabled_commands TEXT[] DEFAULT '{}',
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, server_id)
);

CREATE TABLE IF NOT EXISTS bot_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  command_name TEXT,
  user_id UUID,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view public bots and own bots" ON bots
  FOR SELECT USING (public = true OR owner_id = auth.uid());

CREATE POLICY "Users can create own bots" ON bots
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own bots" ON bots
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete own bots" ON bots
  FOR DELETE USING (owner_id = auth.uid());
