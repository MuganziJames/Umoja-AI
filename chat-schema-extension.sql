-- AI Chat Support Database Schema Extension
-- Add this to your existing schema for Phase 2 implementation

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    is_anonymous BOOLEAN DEFAULT false,
    crisis_detected BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    is_crisis BOOLEAN DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Analytics Table
CREATE TABLE IF NOT EXISTS chat_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'session_start', 'message_sent', 'crisis_detected', 'resources_provided'
    event_data JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Chat Sessions
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions
    FOR SELECT USING (
        auth.uid() = user_id OR 
        (is_anonymous = true AND user_id IS NULL)
    );

CREATE POLICY "Users can create chat sessions" ON chat_sessions
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        (is_anonymous = true AND user_id IS NULL)
    );

CREATE POLICY "Users can update their own chat sessions" ON chat_sessions
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        (is_anonymous = true AND user_id IS NULL)
    );

-- RLS Policies for Chat Messages
CREATE POLICY "Users can view messages from their sessions" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = session_id 
            AND (auth.uid() = user_id OR (is_anonymous = true AND user_id IS NULL))
        )
    );

CREATE POLICY "Users can create messages in their sessions" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = session_id 
            AND (auth.uid() = user_id OR (is_anonymous = true AND user_id IS NULL))
        )
    );

-- RLS Policies for Chat Analytics
CREATE POLICY "Users can view analytics for their sessions" ON chat_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE id = session_id 
            AND (auth.uid() = user_id OR (is_anonymous = true AND user_id IS NULL))
        )
    );

CREATE POLICY "Analytics can be inserted for any session" ON chat_analytics
    FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_created_at ON chat_sessions(created_at);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_chat_analytics_session_id ON chat_analytics(session_id);
CREATE INDEX idx_chat_analytics_event_type ON chat_analytics(event_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updating updated_at
CREATE TRIGGER update_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW
    EXECUTE PROCEDURE update_chat_session_updated_at();
