-- Create voice channels table
CREATE TABLE IF NOT EXISTS voice_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  position INTEGER DEFAULT 0,
  user_limit INTEGER DEFAULT 0, -- 0 = unlimited
  bitrate INTEGER DEFAULT 64000,
  region TEXT DEFAULT 'auto',
  permissions BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create voice sessions table (who's in which voice channel)
CREATE TABLE IF NOT EXISTS voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  channel_id UUID NOT NULL REFERENCES voice_channels(id) ON DELETE CASCADE,
  server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  is_muted BOOLEAN DEFAULT false,
  is_deafened BOOLEAN DEFAULT false,
  is_speaking BOOLEAN DEFAULT false,
  is_video_enabled BOOLEAN DEFAULT false,
  is_screen_sharing BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- Create video calls table (for direct calls)
CREATE TABLE IF NOT EXISTS video_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id TEXT NOT NULL,
  callee_id TEXT NOT NULL,
  call_type TEXT DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'declined', 'missed')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration INTEGER DEFAULT 0, -- in seconds
  UNIQUE(caller_id, callee_id, started_at)
);

-- Create call participants table
CREATE TABLE IF NOT EXISTS call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id UUID NOT NULL REFERENCES video_calls(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT false,
  is_video_enabled BOOLEAN DEFAULT false,
  is_screen_sharing BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_voice_channels_server_id ON voice_channels(server_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_channel_id ON voice_sessions(channel_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user_id ON voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_caller_id ON video_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_callee_id ON video_calls(callee_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON video_calls(status);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_voice_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_voice_channels_updated_at
  BEFORE UPDATE ON voice_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_channels_updated_at();

-- Enable RLS
ALTER TABLE voice_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voice_channels
CREATE POLICY "Users can view voice channels in their servers" ON voice_channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM server_members 
      WHERE server_members.server_id = voice_channels.server_id 
      AND server_members.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage voice channels in managed servers" ON voice_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM server_members sm
      JOIN member_roles mr ON sm.id = mr.member_id
      JOIN roles r ON mr.role_id = r.id
      WHERE sm.server_id = voice_channels.server_id
      AND sm.user_id = auth.uid()::text
      AND (r.permissions & 16) = 16 -- MANAGE_CHANNELS permission
    )
  );

-- RLS Policies for voice_sessions
CREATE POLICY "Users can view voice sessions in their servers" ON voice_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM server_members 
      WHERE server_members.server_id = voice_sessions.server_id 
      AND server_members.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage their own voice sessions" ON voice_sessions
  FOR ALL USING (user_id = auth.uid()::text); -- fixed uuid = text operator error by adding proper text casting

-- RLS Policies for video_calls
CREATE POLICY "Users can view their own calls" ON video_calls
  FOR SELECT USING (caller_id = auth.uid()::text OR callee_id = auth.uid()::text);

CREATE POLICY "Users can create calls" ON video_calls
  FOR INSERT WITH CHECK (caller_id = auth.uid()::text);

CREATE POLICY "Users can update their own calls" ON video_calls
  FOR UPDATE USING (caller_id = auth.uid()::text OR callee_id = auth.uid()::text);

-- RLS Policies for call_participants
CREATE POLICY "Users can view call participants for their calls" ON call_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM video_calls 
      WHERE video_calls.id = call_participants.call_id 
      AND (video_calls.caller_id = auth.uid()::text OR video_calls.callee_id = auth.uid()::text)
    )
  );

CREATE POLICY "Users can manage their own participation" ON call_participants
  FOR ALL USING (user_id = auth.uid()::text); -- fixed uuid = text operator error
