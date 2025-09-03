-- Update voice/video tables to match existing schema
-- The existing tables already have the correct structure, just add missing indexes

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_sessions_channel_id ON call_sessions(channel_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_dm_channel_id ON call_sessions(dm_channel_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_started_by ON call_sessions(started_by);
CREATE INDEX IF NOT EXISTS idx_call_participants_session_id ON call_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_call_participants_user_id ON call_participants(user_id);

-- Update RLS policies to use proper UUID comparisons
DROP POLICY IF EXISTS "Users can manage their own voice sessions" ON call_participants;
CREATE POLICY "Users can manage their own voice sessions" ON call_participants
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own calls" ON call_sessions;
CREATE POLICY "Users can view their own calls" ON call_sessions
  FOR SELECT USING (started_by = auth.uid());

DROP POLICY IF EXISTS "Users can create calls" ON call_sessions;
CREATE POLICY "Users can create calls" ON call_sessions
  FOR INSERT WITH CHECK (started_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own calls" ON call_sessions;
CREATE POLICY "Users can update their own calls" ON call_sessions
  FOR UPDATE USING (started_by = auth.uid());
