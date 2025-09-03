-- Server bans table
CREATE TABLE IF NOT EXISTS public.server_bans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

-- Server timeouts table
CREATE TABLE IF NOT EXISTS public.server_timeouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timeout_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(server_id, user_id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT,
  duration TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on moderation tables
ALTER TABLE server_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_timeouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for moderation tables
CREATE POLICY "Server members can view bans" ON server_bans FOR SELECT USING (
  server_id IN (
    SELECT server_id FROM server_members sm 
    JOIN users u ON sm.user_id = u.id 
    WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
  )
);

CREATE POLICY "Server members can view timeouts" ON server_timeouts FOR SELECT USING (
  server_id IN (
    SELECT server_id FROM server_members sm 
    JOIN users u ON sm.user_id = u.id 
    WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
  )
);

CREATE POLICY "Server members can view audit logs" ON audit_logs FOR SELECT USING (
  server_id IN (
    SELECT server_id FROM server_members sm 
    JOIN users u ON sm.user_id = u.id 
    WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
  )
);

-- Moderators can insert moderation records
CREATE POLICY "Moderators can create bans" ON server_bans FOR INSERT WITH CHECK (
  banned_by IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);

CREATE POLICY "Moderators can create timeouts" ON server_timeouts FOR INSERT WITH CHECK (
  timeout_by IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);

CREATE POLICY "Users can create audit logs" ON audit_logs FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_server_bans_server_id ON server_bans(server_id);
CREATE INDEX IF NOT EXISTS idx_server_bans_user_id ON server_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_server_timeouts_server_id ON server_timeouts(server_id);
CREATE INDEX IF NOT EXISTS idx_server_timeouts_user_id ON server_timeouts(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_server_id ON audit_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Function to clean up expired bans and timeouts
CREATE OR REPLACE FUNCTION cleanup_expired_moderation()
RETURNS void AS $$
BEGIN
  -- Remove expired bans
  DELETE FROM server_bans 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  -- Remove expired timeouts
  DELETE FROM server_timeouts 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
