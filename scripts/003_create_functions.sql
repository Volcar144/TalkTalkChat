-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile when StackAuth user is created
CREATE OR REPLACE FUNCTION create_user_profile(stack_user_id TEXT, username TEXT, display_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO users (stack_user_id, username, display_name)
    VALUES (stack_user_id, username, COALESCE(display_name, username))
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a DM channel between two users
CREATE OR REPLACE FUNCTION create_dm_channel(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    channel_id UUID;
    existing_channel_id UUID;
BEGIN
    -- Check if DM channel already exists between these users
    SELECT dc.id INTO existing_channel_id
    FROM dm_channels dc
    JOIN dm_participants dp1 ON dc.id = dp1.channel_id
    JOIN dm_participants dp2 ON dc.id = dp2.channel_id
    WHERE dc.type = 'dm'
    AND dp1.user_id = user1_id
    AND dp2.user_id = user2_id;
    
    IF existing_channel_id IS NOT NULL THEN
        RETURN existing_channel_id;
    END IF;
    
    -- Create new DM channel
    INSERT INTO dm_channels (type) VALUES ('dm') RETURNING id INTO channel_id;
    
    -- Add participants
    INSERT INTO dm_participants (channel_id, user_id) VALUES (channel_id, user1_id);
    INSERT INTO dm_participants (channel_id, user_id) VALUES (channel_id, user2_id);
    
    RETURN channel_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join server via invite
CREATE OR REPLACE FUNCTION join_server_via_invite(invite_code TEXT, joining_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    invite_record RECORD;
    existing_member UUID;
BEGIN
    -- Get invite details
    SELECT * INTO invite_record FROM invites 
    WHERE code = invite_code 
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses = 0 OR uses < max_uses);
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is already a member
    SELECT id INTO existing_member FROM server_members 
    WHERE server_id = invite_record.server_id AND user_id = joining_user_id;
    
    IF existing_member IS NOT NULL THEN
        RETURN TRUE; -- Already a member
    END IF;
    
    -- Add user to server
    INSERT INTO server_members (server_id, user_id) 
    VALUES (invite_record.server_id, joining_user_id);
    
    -- Update invite usage
    UPDATE invites SET uses = uses + 1 WHERE id = invite_record.id;
    
    -- Update server member count
    UPDATE servers SET member_count = member_count + 1 WHERE id = invite_record.server_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
