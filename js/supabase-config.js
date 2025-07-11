// Supabase Configuration
let SUPABASE_URL, SUPABASE_ANON_KEY;

// Use hardcoded values from .env file (simpler approach for script tags)
SUPABASE_URL = "https://iiqvqveluzicnsxushgg.supabase.co";
SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcXZxdmVsdXppY25zeHVzaGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjczMTksImV4cCI6MjA2Nzc0MzMxOX0.CcF6WLWWRHK0-TP2Rhvd2wQoqXGv9dpMTtYuAUTQl4M";

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Supabase environment variables not found.");
  console.error("Please create a .env file with your Supabase credentials:");
  console.error("VITE_SUPABASE_URL=your_supabase_url");
  console.error("VITE_SUPABASE_ANON_KEY=your_supabase_anon_key");

  // Show user-friendly error message
  if (window.GlobalErrorHandler) {
    window.GlobalErrorHandler.reportError(
      new Error(
        "Supabase configuration missing. Please check your environment variables."
      ),
      { context: "supabase-config" }
    );
  }

  throw new Error(
    "Missing Supabase configuration. Please check your environment variables."
  );
}

// Initialize Supabase client
let supabase = null;

// Wait for Supabase library to be available
function initializeSupabase() {
  console.log("🔄 Attempting to initialize Supabase...");

  // Check for both window.Supabase and window.supabase (different CDN versions use different casing)
  const SupabaseLib = window.Supabase || window.supabase;

  if (
    SupabaseLib &&
    SupabaseLib.createClient &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
  ) {
    try {
      supabase = SupabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("✅ Supabase client initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to create Supabase client:", error);
      return false;
    }
  } else {
    console.log("⏳ Supabase not ready yet...", {
      hasSupabase: !!(window.Supabase || window.supabase),
      hasCreateClient: !!(SupabaseLib && SupabaseLib.createClient),
      hasUrl: !!SUPABASE_URL,
      hasKey: !!SUPABASE_ANON_KEY,
      windowSupabase: typeof window.Supabase,
      windowSupabaseLower: typeof window.supabase,
    });
  }
  return false;
}

// Try to initialize immediately
if (!initializeSupabase()) {
  // If not available, wait for library to load
  console.log("⏳ Waiting for Supabase library to load...");

  // Check periodically for Supabase library (more frequently at first, then less)
  let attempts = 0;
  const maxAttempts = 100; // 20 seconds total

  const checkInterval = setInterval(
    () => {
      attempts++;

      if (initializeSupabase()) {
        clearInterval(checkInterval);
        // Recreate UmojaConfig when Supabase is ready
        createUmojaConfig();
        console.log(
          "🎉 Supabase initialization complete after",
          attempts,
          "attempts"
        );
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error("❌ Supabase library failed to load within timeout");

        // Try one more time with fallback approach
        console.log("🔄 Trying fallback initialization...");
        setTimeout(() => {
          if (initializeSupabase()) {
            createUmojaConfig();
          } else {
            console.error("❌ Fallback initialization also failed");
          }
        }, 2000);
      }
    },
    attempts < 20 ? 100 : 200
  ); // Check every 100ms first 20 times, then every 200ms
}

// Database table names (matching schema.sql)
const TABLES = {
  STORIES: "stories",
  USER_PROFILES: "user_profiles",
  CATEGORIES: "categories",
  STORY_ANALYTICS: "story_analytics",
  STORY_DRAFTS: "story_drafts",
  COMMENTS: "comments",
  LIKES: "likes",
  BOOKMARKS: "bookmarks",
  TAGS: "tags",
  STORY_TAGS: "story_tags",
};

// Story status constants (must match schema enum values exactly)
const STORY_STATUS = {
  DRAFT: "draft",
  PENDING: "pending_review", // Fixed: matches schema enum
  APPROVED: "approved",
  REJECTED: "rejected",
  ARCHIVED: "archived", // Added missing status from schema
};

// Export for use in other files
function createUmojaConfig() {
  console.log("🔄 Creating UmojaConfig...", {
    supabase: !!supabase,
    TABLES,
    STORY_STATUS,
  });

  window.UmojaConfig = {
    supabase,
    TABLES,
    STORY_STATUS,
  };

  console.log("✅ UmojaConfig created successfully");
}

// Create initial config
createUmojaConfig();

// Export function to recreate config when supabase is ready
window.createUmojaConfig = createUmojaConfig;
