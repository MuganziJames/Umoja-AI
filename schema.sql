-- Umoja AI Database Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Drop existing functions first (CASCADE will handle dependent triggers)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_story_counts() CASCADE;
DROP FUNCTION IF EXISTS update_user_stats() CASCADE;
DROP FUNCTION IF EXISTS calculate_reading_time() CASCADE;

-- Drop existing views
DROP VIEW IF EXISTS featured_stories CASCADE;
DROP VIEW IF EXISTS trending_stories CASCADE;
DROP VIEW IF EXISTS recent_stories CASCADE;

-- Drop existing RLS policies on all tables
DROP POLICY IF EXISTS "Anyone can view approved stories" ON stories;
DROP POLICY IF EXISTS "Users can view own stories" ON stories;
DROP POLICY IF EXISTS "Moderators can view all stories" ON stories;
DROP POLICY IF EXISTS "Users can insert own stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Moderators can update any story" ON stories;
DROP POLICY IF EXISTS "Everyone can view all stories" ON stories;
DROP POLICY IF EXISTS "Authenticated users can insert stories" ON stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON stories;

-- Drop all existing tables (CASCADE will automatically drop triggers and remaining policies)
DROP TABLE IF EXISTS ai_request_logs CASCADE;
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS newsletter_subscriptions CASCADE;
DROP TABLE IF EXISTS saved_stories CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS comment_likes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS story_analytics CASCADE;
DROP TABLE IF EXISTS story_tags CASCADE;
DROP TABLE IF EXISTS story_drafts CASCADE;
DROP TABLE IF EXISTS story_revisions CASCADE;
DROP TABLE IF EXISTS story_collaborators CASCADE;
DROP TABLE IF EXISTS story_reports CASCADE;
DROP TABLE IF EXISTS stories CASCADE;
DROP TABLE IF EXISTS user_follows CASCADE;
DROP TABLE IF EXISTS user_notifications CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS story_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS content_sentiment CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS report_status CASCADE;
DROP TYPE IF EXISTS collaboration_role CASCADE;

-- Create custom types
CREATE TYPE story_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'archived');
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');
CREATE TYPE content_sentiment AS ENUM ('positive', 'negative', 'neutral', 'mixed');
CREATE TYPE notification_type AS ENUM ('story_approved', 'story_rejected', 'new_comment', 'new_like', 'new_follower', 'system');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE collaboration_role AS ENUM ('editor', 'reviewer', 'viewer');

-- Core Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3498db',
    icon TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    parent_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags table for flexible content tagging
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extended user profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    website TEXT,
    location TEXT,
    phone TEXT,
    date_of_birth DATE,
    gender TEXT,
    role user_role DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}',
    social_links JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{"stories_count": 0, "followers_count": 0, "following_count": 0}',
    member_since TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main stories table
CREATE TABLE stories (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    category TEXT NOT NULL,
    status story_status DEFAULT 'draft',
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    allow_comments BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    audio_url TEXT,
    video_url TEXT,
    reading_time INTEGER DEFAULT 0,
    sentiment_data JSONB,
    ai_metadata JSONB DEFAULT '{}',
    seo_metadata JSONB DEFAULT '{}',
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    bookmark_count INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES categories(id),
    moderator_id UUID REFERENCES auth.users(id),
    moderation_notes TEXT,
    rejection_reason TEXT,
    published_at TIMESTAMPTZ,
    featured_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story drafts with version control
CREATE TABLE story_drafts (
    id BIGSERIAL PRIMARY KEY,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    author_name TEXT,
    category TEXT,
    image_url TEXT,
    auto_save BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story revisions for edit history
CREATE TABLE story_revisions (
    id BIGSERIAL PRIMARY KEY,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    changes_description TEXT,
    version INTEGER NOT NULL,
    editor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story collaborators for multi-author stories
CREATE TABLE story_collaborators (
    id BIGSERIAL PRIMARY KEY,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role collaboration_role DEFAULT 'editor',
    invited_by UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(story_id, user_id)
);

-- Story tags junction table
CREATE TABLE story_tags (
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (story_id, tag_id)
);

-- Enhanced analytics table
CREATE TABLE story_analytics (
    id BIGSERIAL PRIMARY KEY,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    session_id TEXT,
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,
    read_duration INTEGER,
    scroll_depth FLOAT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments with threading support
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    is_pinned BOOLEAN DEFAULT FALSE,
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    moderator_id UUID REFERENCES auth.users(id),
    moderation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment likes
CREATE TABLE comment_likes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, comment_id)
);

-- Story likes/reactions
CREATE TABLE likes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    reaction_type TEXT DEFAULT 'like',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, story_id)
);

-- User bookmarks/saved stories
CREATE TABLE bookmarks (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    collection_name TEXT DEFAULT 'default',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, story_id)
);

-- User following system
CREATE TABLE user_follows (
    id BIGSERIAL PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- User notifications
CREATE TABLE user_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    related_user_id UUID REFERENCES auth.users(id),
    related_story_id BIGINT REFERENCES stories(id),
    related_comment_id BIGINT REFERENCES comments(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story reports for content moderation
CREATE TABLE story_reports (
    id BIGSERIAL PRIMARY KEY,
    story_id BIGINT REFERENCES stories(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    moderator_id UUID REFERENCES auth.users(id),
    moderator_notes TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Newsletter subscriptions
CREATE TABLE newsletter_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    frequency TEXT DEFAULT 'weekly',
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    preferences JSONB DEFAULT '{}',
    verification_token TEXT,
    verified_at TIMESTAMPTZ,
    subscribed_at TIMESTAMPTZ DEFAULT NOW(),
    unsubscribed_at TIMESTAMPTZ
);

-- Contact form submissions
CREATE TABLE contact_submissions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'new',
    priority TEXT DEFAULT 'medium',
    assigned_to UUID REFERENCES auth.users(id),
    ip_address INET,
    user_agent TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User session tracking
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI request logging and usage tracking
CREATE TABLE ai_request_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL,
    model_used TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    input_data JSONB,
    output_data JSONB,
    cost_cents INTEGER,
    duration_ms INTEGER,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin settings and configuration
CREATE TABLE admin_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories with proper hierarchy (with conflict handling)
INSERT INTO categories (name, slug, description, color, icon, sort_order) VALUES
('Mental Health', 'mental-health', 'Stories about mental health experiences and recovery', '#9b59b6', 'fas fa-brain', 1),
('Gender Issues', 'gender-issues', 'Stories about gender equality and women empowerment', '#e91e63', 'fas fa-venus-mars', 2),
('Social Justice', 'social-justice', 'Stories about social justice and equality', '#f39c12', 'fas fa-balance-scale', 3),
('Community', 'community', 'Stories about community building and social impact', '#2ecc71', 'fas fa-users', 4),
('Education', 'education', 'Stories about education and learning', '#3498db', 'fas fa-graduation-cap', 5),
('Healthcare', 'healthcare', 'Stories about healthcare access and experiences', '#e74c3c', 'fas fa-heartbeat', 6),
('Technology', 'technology', 'Stories about technology and digital transformation', '#34495e', 'fas fa-laptop-code', 7),
('Environment', 'environment', 'Stories about environmental issues and sustainability', '#27ae60', 'fas fa-leaf', 8),
('Personal Growth', 'personal-growth', 'Stories about personal development and self-improvement', '#ff6b6b', 'fas fa-seedling', 9),
('Entrepreneurship', 'entrepreneurship', 'Stories about business and entrepreneurial journeys', '#f39800', 'fas fa-rocket', 10)
ON CONFLICT (slug) DO NOTHING;

-- Insert default admin settings (with conflict handling)
INSERT INTO admin_settings (key, value, description, is_public) VALUES
('site_name', '"Voices of Change"', 'Website name', true),
('site_description', '"Amplifying stories that matter"', 'Website description', true),
('max_story_length', '10000', 'Maximum story character limit', false),
('moderation_enabled', 'true', 'Enable content moderation', false),
('ai_features_enabled', 'true', 'Enable AI-powered features', false),
('email_notifications_enabled', 'true', 'Enable email notifications', false),
('registration_enabled', 'true', 'Allow new user registration', true),
('comments_enabled', 'true', 'Enable story comments', true),
('file_upload_max_size', '5242880', 'Max file upload size in bytes (5MB)', false)
ON CONFLICT (key) DO NOTHING;

-- Performance indexes
CREATE INDEX idx_stories_status ON stories(status);
CREATE INDEX idx_stories_category ON stories(category);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_stories_published_at ON stories(published_at DESC);
CREATE INDEX idx_stories_featured ON stories(is_featured, published_at DESC);
CREATE INDEX idx_stories_trending ON stories(is_trending, view_count DESC);
CREATE INDEX idx_stories_search ON stories USING gin(to_tsvector('english', title || ' ' || content));

CREATE INDEX idx_story_analytics_story_id ON story_analytics(story_id);
CREATE INDEX idx_story_analytics_event_type ON story_analytics(event_type);
CREATE INDEX idx_story_analytics_created_at ON story_analytics(created_at);

CREATE INDEX idx_comments_story_id ON comments(story_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

CREATE INDEX idx_likes_story_id ON likes(story_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

CREATE INDEX idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_story_id ON bookmarks(story_id);

CREATE INDEX idx_user_profiles_username ON user_profiles(username);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_is_verified ON user_profiles(is_verified);

CREATE INDEX idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON user_follows(following_id);

CREATE INDEX idx_user_notifications_user_id ON user_notifications(user_id, is_read);
CREATE INDEX idx_user_notifications_created_at ON user_notifications(created_at DESC);

CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC);

-- Text search indexes
CREATE INDEX idx_stories_title_search ON stories USING gin(to_tsvector('english', title));
CREATE INDEX idx_stories_content_search ON stories USING gin(to_tsvector('english', content));

-- Row Level Security (RLS) Policies
-- Enable RLS only on user-data tables that need access control
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Disable RLS on public reference tables and system tables
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE story_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_logs DISABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Stories policies
CREATE POLICY "Anyone can view approved stories" ON stories
    FOR SELECT USING (status = 'approved');

CREATE POLICY "Users can view own stories" ON stories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Moderators can view all stories" ON stories
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'super_admin'))
    );

CREATE POLICY "Users can insert own stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id AND status IN ('draft', 'rejected'));

CREATE POLICY "Moderators can update any story" ON stories
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'super_admin'))
    );

-- Story drafts policies
CREATE POLICY "Users can manage own drafts" ON story_drafts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Collaborators can view drafts" ON story_drafts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM story_collaborators sc 
            WHERE sc.story_id = story_drafts.story_id 
            AND sc.user_id = auth.uid() 
            AND sc.accepted_at IS NOT NULL
        )
    );

-- Story revisions policies
CREATE POLICY "Users can view own story revisions" ON story_revisions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM stories WHERE id = story_revisions.story_id AND user_id = auth.uid())
    );

-- Comments policies
CREATE POLICY "Anyone can view approved comments" ON comments
    FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view own comments" ON comments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert comments" ON comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Moderators can manage all comments" ON comments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'super_admin'))
    );

-- Likes policies
CREATE POLICY "Users can manage own likes" ON likes
    FOR ALL USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can manage own bookmarks" ON bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- User follows policies
CREATE POLICY "Users can manage own follows" ON user_follows
    FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Anyone can view follows" ON user_follows
    FOR SELECT USING (true);

-- Notifications policies
CREATE POLICY "Users can manage own notifications" ON user_notifications
    FOR ALL USING (auth.uid() = user_id);

-- Story reports policies
CREATE POLICY "Users can create reports" ON story_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Moderators can manage reports" ON story_reports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'super_admin'))
    );

-- Comment likes policies
CREATE POLICY "Users can manage own comment likes" ON comment_likes
    FOR ALL USING (auth.uid() = user_id);

-- Functions and triggers for automation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, full_name, username)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)), ' ', '_'))
    );
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION update_story_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update comment count on stories
    IF TG_TABLE_NAME = 'comments' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE stories SET comment_count = comment_count + 1 WHERE id = NEW.story_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE stories SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.story_id;
        END IF;
    END IF;
    
    -- Update like count on stories
    IF TG_TABLE_NAME = 'likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE stories SET like_count = like_count + 1 WHERE id = NEW.story_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE stories SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.story_id;
        END IF;
    END IF;
    
    -- Update bookmark count on stories
    IF TG_TABLE_NAME = 'bookmarks' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE stories SET bookmark_count = bookmark_count + 1 WHERE id = NEW.story_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE stories SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.story_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update follower/following counts
    IF TG_TABLE_NAME = 'user_follows' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE user_profiles SET stats = jsonb_set(stats, '{followers_count}', 
                (COALESCE((stats->>'followers_count')::int, 0) + 1)::text::jsonb)
                WHERE id = NEW.following_id;
            UPDATE user_profiles SET stats = jsonb_set(stats, '{following_count}', 
                (COALESCE((stats->>'following_count')::int, 0) + 1)::text::jsonb)
                WHERE id = NEW.follower_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE user_profiles SET stats = jsonb_set(stats, '{followers_count}', 
                GREATEST(COALESCE((stats->>'followers_count')::int, 0) - 1, 0)::text::jsonb)
                WHERE id = OLD.following_id;
            UPDATE user_profiles SET stats = jsonb_set(stats, '{following_count}', 
                GREATEST(COALESCE((stats->>'following_count')::int, 0) - 1, 0)::text::jsonb)
                WHERE id = OLD.follower_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE FUNCTION calculate_reading_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate reading time (average 200 words per minute)
    NEW.reading_time = CEIL(array_length(string_to_array(NEW.content, ' '), 1) / 200.0);
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Create triggers (with proper error handling)
DO $$ 
BEGIN
    -- Update triggers for timestamp columns
    CREATE TRIGGER update_user_profiles_updated_at 
        BEFORE UPDATE ON user_profiles
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_stories_updated_at 
        BEFORE UPDATE ON stories
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_story_drafts_updated_at 
        BEFORE UPDATE ON story_drafts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_comments_updated_at 
        BEFORE UPDATE ON comments
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_admin_settings_updated_at 
        BEFORE UPDATE ON admin_settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- User creation trigger
DO $$ 
BEGIN
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION handle_new_user();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Story automation triggers
DO $$ 
BEGIN
    CREATE TRIGGER calculate_story_reading_time
        BEFORE INSERT OR UPDATE ON stories
        FOR EACH ROW EXECUTE FUNCTION calculate_reading_time();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_story_comment_count
        AFTER INSERT OR DELETE ON comments
        FOR EACH ROW EXECUTE FUNCTION update_story_counts();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_story_like_count
        AFTER INSERT OR DELETE ON likes
        FOR EACH ROW EXECUTE FUNCTION update_story_counts();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_story_bookmark_count
        AFTER INSERT OR DELETE ON bookmarks
        FOR EACH ROW EXECUTE FUNCTION update_story_counts();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    CREATE TRIGGER update_user_follow_stats
        AFTER INSERT OR DELETE ON user_follows
        FOR EACH ROW EXECUTE FUNCTION update_user_stats();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Views for easy querying
CREATE OR REPLACE VIEW featured_stories AS
SELECT s.*, up.full_name as author_full_name, up.avatar_url as author_avatar
FROM stories s
LEFT JOIN user_profiles up ON s.user_id = up.id
WHERE s.is_featured = true AND s.status = 'approved'
ORDER BY s.featured_at DESC;

CREATE OR REPLACE VIEW trending_stories AS
SELECT s.*, up.full_name as author_full_name, up.avatar_url as author_avatar
FROM stories s
LEFT JOIN user_profiles up ON s.user_id = up.id
WHERE s.status = 'approved'
ORDER BY s.view_count DESC, s.like_count DESC, s.created_at DESC;

CREATE OR REPLACE VIEW recent_stories AS
SELECT s.*, up.full_name as author_full_name, up.avatar_url as author_avatar
FROM stories s
LEFT JOIN user_profiles up ON s.user_id = up.id
WHERE s.status = 'approved'
ORDER BY s.published_at DESC;

-- COMPREHENSIVE RLS POLICIES
-- Each table gets ONE policy that covers ALL operations (SELECT, INSERT, UPDATE, DELETE)

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;  
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Categories: Public read, admin-only write
CREATE POLICY "Categories select access" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Categories modify access" ON categories
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Categories update access" ON categories
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Categories delete access" ON categories
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Tags: Public read, authenticated users can create
CREATE POLICY "Tags select access" ON tags
  FOR SELECT USING (true);

CREATE POLICY "Tags insert access" ON tags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Tags update access" ON tags
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Tags delete access" ON tags
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- User Profiles: Users can see all profiles, but only manage their own
CREATE POLICY "User profiles select access" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "User profiles insert access" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "User profiles update access" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "User profiles delete access" ON user_profiles
  FOR DELETE USING (id = auth.uid());

-- Stories: Public read for approved, users manage their own
CREATE POLICY "Stories select access" ON stories
  FOR SELECT USING (status = 'approved' OR user_id = auth.uid());

CREATE POLICY "Stories insert access" ON stories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Stories update access" ON stories
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Stories delete access" ON stories
  FOR DELETE USING (user_id = auth.uid());

-- Story Drafts: Users can only access their own drafts
CREATE POLICY "Story drafts access" ON story_drafts
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Story Revisions: Users can see revisions of their own stories
CREATE POLICY "Story revisions access" ON story_revisions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  );

-- Story Collaborators: Users can manage collaborations on their own stories
CREATE POLICY "Story collaborators access" ON story_collaborators
  FOR ALL USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  );

-- Story Tags: Public read, story owners can manage tags on their stories
CREATE POLICY "Story tags select access" ON story_tags
  FOR SELECT USING (true);

CREATE POLICY "Story tags modify access" ON story_tags
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  );

CREATE POLICY "Story tags update access" ON story_tags
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  );

CREATE POLICY "Story tags delete access" ON story_tags
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  );

-- Story Analytics: Public read for approved stories, story owners can see all
CREATE POLICY "Story analytics select access" ON story_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND (status = 'approved' OR user_id = auth.uid()))
  );

CREATE POLICY "Story analytics insert access" ON story_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Story analytics update access" ON story_analytics
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  );

CREATE POLICY "Story analytics delete access" ON story_analytics
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
  );

-- Comments: Public read on approved stories, users manage their own comments
CREATE POLICY "Comments select access" ON comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND status = 'approved')
  );

CREATE POLICY "Comments insert access" ON comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Comments update access" ON comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Comments delete access" ON comments
  FOR DELETE USING (user_id = auth.uid());

-- Comment Likes: Users can like comments on approved stories
CREATE POLICY "Comment likes select access" ON comment_likes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM comments c 
      JOIN stories s ON c.story_id = s.id 
      WHERE c.id = comment_id AND s.status = 'approved'
    )
  );

CREATE POLICY "Comment likes modify access" ON comment_likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Comment likes update access" ON comment_likes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Comment likes delete access" ON comment_likes
  FOR DELETE USING (user_id = auth.uid());

-- Likes: Users can like approved stories
CREATE POLICY "Likes select access" ON likes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE id = story_id AND status = 'approved')
  );

CREATE POLICY "Likes modify access" ON likes
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Likes update access" ON likes
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Likes delete access" ON likes
  FOR DELETE USING (user_id = auth.uid());

-- Bookmarks: Users manage their own bookmarks
CREATE POLICY "Bookmarks access" ON bookmarks
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User Follows: Users manage their own follows
CREATE POLICY "User follows select access" ON user_follows
  FOR SELECT USING (
    follower_id = auth.uid() OR following_id = auth.uid()
  );

CREATE POLICY "User follows insert access" ON user_follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "User follows update access" ON user_follows
  FOR UPDATE USING (follower_id = auth.uid());

CREATE POLICY "User follows delete access" ON user_follows
  FOR DELETE USING (follower_id = auth.uid());

-- User Notifications: Users see only their own notifications
CREATE POLICY "User notifications access" ON user_notifications
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Story Reports: Users can report stories, admins can manage reports
CREATE POLICY "Story reports select access" ON story_reports
  FOR SELECT USING (
    reporter_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Story reports insert access" ON story_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Story reports update access" ON story_reports
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Story reports delete access" ON story_reports
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Newsletter Subscriptions: Public can subscribe, users manage their own
CREATE POLICY "Newsletter subscriptions access" ON newsletter_subscriptions
  FOR ALL USING (true)
  WITH CHECK (true);

-- Contact Submissions: Anyone can submit, admins can view
CREATE POLICY "Contact submissions select access" ON contact_submissions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Contact submissions insert access" ON contact_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Contact submissions update access" ON contact_submissions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Contact submissions delete access" ON contact_submissions
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- User Sessions: Users manage their own sessions
CREATE POLICY "User sessions access" ON user_sessions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- AI Request Logs: Users can see their own requests, admins can see all
CREATE POLICY "AI request logs select access" ON ai_request_logs
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "AI request logs insert access" ON ai_request_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "AI request logs update access" ON ai_request_logs
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "AI request logs delete access" ON ai_request_logs
  FOR DELETE USING (user_id = auth.uid());

-- Admin Settings: Admin-only access
CREATE POLICY "Admin settings access" ON admin_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
