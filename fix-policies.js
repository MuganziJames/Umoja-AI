// Database Admin Utility - Fix Stories RLS Policies
// Run this in the browser console when on your site with authentication

async function fixStoriesPolicies() {
  try {
    console.log("🔧 Starting RLS policy fix...");

    if (!window.UmojaConfig?.supabase) {
      throw new Error("Supabase not initialized");
    }

    const supabase = window.UmojaConfig.supabase;

    // SQL to drop existing policies and create new simple ones
    const sql = `
      -- Drop all existing story policies
      DROP POLICY IF EXISTS "Anyone can view approved stories" ON stories;
      DROP POLICY IF EXISTS "Users can view own stories" ON stories;
      DROP POLICY IF EXISTS "Moderators can view all stories" ON stories;
      DROP POLICY IF EXISTS "Users can insert own stories" ON stories;
      DROP POLICY IF EXISTS "Users can update own stories" ON stories;
      DROP POLICY IF EXISTS "Moderators can update any story" ON stories;
      
      -- Create simple, permissive policies
      CREATE POLICY "Everyone can view all stories" ON stories
          FOR SELECT USING (true);
      
      CREATE POLICY "Authenticated users can insert stories" ON stories
          FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
      
      CREATE POLICY "Users can update own stories" ON stories
          FOR UPDATE USING (auth.uid() = user_id);
      
      CREATE POLICY "Users can delete own stories" ON stories
          FOR DELETE USING (auth.uid() = user_id);
    `;

    console.log("📝 Executing SQL to fix policies...");

    // Execute the SQL
    const { data, error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("❌ Error executing SQL:", error);
      // If the RPC doesn't exist, try alternative approach
      console.log("🔄 Trying alternative approach...");

      // Try using the SQL editor approach
      console.log("Please run the following SQL in your Supabase SQL editor:");
      console.log(sql);
      return false;
    }

    console.log("✅ RLS policies updated successfully!");
    console.log("Data:", data);
    return true;
  } catch (error) {
    console.error("❌ Failed to fix policies:", error);
    console.log(
      "\n📋 Please manually run this SQL in your Supabase dashboard:"
    );
    console.log(`
-- Drop all existing story policies
DROP POLICY IF EXISTS "Anyone can view approved stories" ON stories;
DROP POLICY IF EXISTS "Users can view own stories" ON stories;
DROP POLICY IF EXISTS "Moderators can view all stories" ON stories;
DROP POLICY IF EXISTS "Users can insert own stories" ON stories;
DROP POLICY IF EXISTS "Users can update own stories" ON stories;
DROP POLICY IF EXISTS "Moderators can update any story" ON stories;

-- Create simple, permissive policies
CREATE POLICY "Everyone can view all stories" ON stories
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert stories" ON stories
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories" ON stories
    FOR DELETE USING (auth.uid() = user_id);
    `);
    return false;
  }
}

// Auto-run if in browser
if (typeof window !== "undefined") {
  console.log(
    "🚀 Database admin utility loaded. Run fixStoriesPolicies() to fix RLS policies."
  );
}
