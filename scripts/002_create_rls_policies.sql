-- RLS Policies for Users table
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (stack_user_id = current_setting('app.current_user_stack_id', true));
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (stack_user_id = current_setting('app.current_user_stack_id', true));

-- RLS Policies for Servers
CREATE POLICY "Anyone can view public servers" ON servers FOR SELECT USING (true);
CREATE POLICY "Server owners can update their servers" ON servers FOR UPDATE USING (
  owner_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);
CREATE POLICY "Users can create servers" ON servers FOR INSERT WITH CHECK (
  owner_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);

-- RLS Policies for Server Members
CREATE POLICY "Members can view server members" ON server_members FOR SELECT USING (
  server_id IN (
    SELECT server_id FROM server_members sm 
    JOIN users u ON sm.user_id = u.id 
    WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
  )
);
CREATE POLICY "Users can join servers" ON server_members FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);

-- RLS Policies for Channels
CREATE POLICY "Server members can view channels" ON channels FOR SELECT USING (
  server_id IN (
    SELECT server_id FROM server_members sm 
    JOIN users u ON sm.user_id = u.id 
    WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
  )
);

-- RLS Policies for DM Channels
CREATE POLICY "Participants can view DM channels" ON dm_channels FOR SELECT USING (
  id IN (
    SELECT channel_id FROM dm_participants dp 
    JOIN users u ON dp.user_id = u.id 
    WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
  )
);
CREATE POLICY "Users can create DM channels" ON dm_channels FOR INSERT WITH CHECK (
  owner_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true)) OR
  owner_id IS NULL
);

-- RLS Policies for DM Participants
CREATE POLICY "Participants can view DM participants" ON dm_participants FOR SELECT USING (
  channel_id IN (
    SELECT channel_id FROM dm_participants dp 
    JOIN users u ON dp.user_id = u.id 
    WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
  )
);

-- RLS Policies for Messages
CREATE POLICY "Server members can view server messages" ON messages FOR SELECT USING (
  (channel_id IS NOT NULL AND channel_id IN (
    SELECT c.id FROM channels c 
    JOIN server_members sm ON c.server_id = sm.server_id 
    JOIN users u ON sm.user_id = u.id 
    WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
  )) OR
  (dm_channel_id IS NOT NULL AND dm_channel_id IN (
    SELECT channel_id FROM dm_participants dp 
    JOIN users u ON dp.user_id = u.id 
    WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
  ))
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  author_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);
CREATE POLICY "Users can edit their own messages" ON messages FOR UPDATE USING (
  author_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);

-- RLS Policies for Message Reactions
CREATE POLICY "Users can view reactions" ON message_reactions FOR SELECT USING (
  message_id IN (
    SELECT id FROM messages WHERE 
    (channel_id IS NOT NULL AND channel_id IN (
      SELECT c.id FROM channels c 
      JOIN server_members sm ON c.server_id = sm.server_id 
      JOIN users u ON sm.user_id = u.id 
      WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
    )) OR
    (dm_channel_id IS NOT NULL AND dm_channel_id IN (
      SELECT channel_id FROM dm_participants dp 
      JOIN users u ON dp.user_id = u.id 
      WHERE u.stack_user_id = current_setting('app.current_user_stack_id', true)
    ))
  )
);
CREATE POLICY "Users can add reactions" ON message_reactions FOR INSERT WITH CHECK (
  user_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);

-- RLS Policies for Bots
CREATE POLICY "Bot owners can manage their bots" ON bots FOR ALL USING (
  owner_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);
CREATE POLICY "Anyone can view public bots" ON bots FOR SELECT USING (public = true);

-- RLS Policies for Invites
CREATE POLICY "Anyone can view invites" ON invites FOR SELECT USING (true);
CREATE POLICY "Server members can create invites" ON invites FOR INSERT WITH CHECK (
  inviter_id IN (SELECT id FROM users WHERE stack_user_id = current_setting('app.current_user_stack_id', true))
);
