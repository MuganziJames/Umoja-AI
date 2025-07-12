-- Fix Stories RLS Policies
-- This script will drop existing complex policies and create simple ones

-- Drop all existing story policies
DROP POLICY IF EXISTS "Anyone can view approved stories" ON stories;
DROP POLICY IF EXISTS "Users can view own stories" ON stories;
DROP POLICY IF EXISTS "Moderators can view all stories" ON stories;
DROP POLICY IF EXISTS "Users can insert own stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Moderators can update any story" ON stories;

-- Create simple, permissive policies
-- Allow everyone to view all stories (no restrictions)
CREATE POLICY "Everyone can view all stories" ON stories
    FOR SELECT USING (true);

-- Allow authenticated users to insert stories
CREATE POLICY "Authenticated users can insert stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own stories
CREATE POLICY "Users can update own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own stories
CREATE POLICY "Users can delete own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);
