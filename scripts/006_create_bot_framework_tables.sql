-- Create bots table
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  token TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  bot_status TEXT DEFAULT 'offline' CHECK (bot_status IN ('online', 'offline', 'maintenance')), -- renamed status to bot_status to avoid conflicts
  command_prefix TEXT DEFAULT '!',
  permissions BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bot commands table
CREATE TABLE IF NOT EXISTS bot_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  usage TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  enabled BOOLEAN DEFAULT true,
  cooldown INTEGER DEFAULT 0,
  permissions_required BIGINT DEFAULT 0,
  response_type TEXT DEFAULT 'text' CHECK (response_type IN ('text', 'embed', 'file', 'reaction')),
  response_content JSONB DEFAULT '{}',
  trigger_conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, name)
);

-- Create bot server installations table
CREATE TABLE IF NOT EXISTS bot_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  installed_by TEXT NOT NULL,
  permissions BIGINT DEFAULT 0,
  custom_prefix TEXT,
  enabled_commands TEXT[] DEFAULT '{}',
  disabled_commands TEXT[] DEFAULT '{}',
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bot_id, server_id)
);

-- Create bot analytics table
CREATE TABLE IF NOT EXISTS bot_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
  command_name TEXT,
  user_id TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time INTEGER DEFAULT 0,
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Create bot webhooks table
CREATE TABLE IF NOT EXISTS bot_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bots_owner_id ON bots(owner_id);
CREATE INDEX IF NOT EXISTS idx_bots_bot_status ON bots(bot_status); -- updated index name to match column rename
CREATE INDEX IF NOT EXISTS idx_bot_commands_bot_id ON bot_commands(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_installations_bot_id ON bot_installations(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_installations_server_id ON bot_installations(server_id);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_bot_id ON bot_analytics(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_executed_at ON bot_analytics(executed_at);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_bots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bots_updated_at
  BEFORE UPDATE ON bots
  FOR EACH ROW
  EXECUTE FUNCTION update_bots_updated_at();

-- Enable RLS
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bots
CREATE POLICY "Users can view public bots and own bots" ON bots
  FOR SELECT USING (is_public = true OR owner_id = auth.uid()::text);

CREATE POLICY "Users can create own bots" ON bots
  FOR INSERT WITH CHECK (owner_id = auth.uid()::text);

CREATE POLICY "Users can update own bots" ON bots
  FOR UPDATE USING (owner_id = auth.uid()::text);

CREATE POLICY "Users can delete own bots" ON bots
  FOR DELETE USING (owner_id = auth.uid()::text);

-- RLS Policies for bot_commands
CREATE POLICY "Users can view commands for accessible bots" ON bot_commands
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bots 
      WHERE bots.id = bot_commands.bot_id 
      AND (bots.is_public = true OR bots.owner_id = auth.uid()::text)
    )
  );

CREATE POLICY "Users can manage commands for own bots" ON bot_commands
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bots 
      WHERE bots.id = bot_commands.bot_id 
      AND bots.owner_id = auth.uid()::text
    )
  );

-- RLS Policies for bot_installations
CREATE POLICY "Users can view installations in their servers" ON bot_installations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM server_members sm
      JOIN member_roles mr ON sm.id = mr.member_id
      JOIN roles r ON mr.role_id = r.id
      WHERE sm.server_id = bot_installations.server_id
      AND sm.user_id = auth.uid()::text
      AND (r.permissions & 8) = 8 -- MANAGE_BOTS permission
    )
  );

CREATE POLICY "Users can install bots in managed servers" ON bot_installations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM server_members sm
      JOIN member_roles mr ON sm.id = mr.member_id
      JOIN roles r ON mr.role_id = r.id
      WHERE sm.server_id = bot_installations.server_id
      AND sm.user_id = auth.uid()::text
      AND (r.permissions & 8) = 8 -- MANAGE_BOTS permission
    )
  );

-- RLS Policies for bot_analytics
CREATE POLICY "Bot owners can view their bot analytics" ON bot_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bots 
      WHERE bots.id = bot_analytics.bot_id 
      AND bots.owner_id = auth.uid()::text
    )
  );

-- RLS Policies for bot_webhooks
CREATE POLICY "Bot owners can manage their bot webhooks" ON bot_webhooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bots 
      WHERE bots.id = bot_webhooks.bot_id 
      AND bots.owner_id = auth.uid()::text
    )
  );
