// Supabase Configuration
let SUPABASE_URL, SUPABASE_ANON_KEY;
let supabase = null;

// Table and status constants
const TABLES = {
  STORIES: "stories",
  STORY_DRAFTS: "story_drafts",
  USER_PROFILES: "user_profiles",
  CATEGORIES: "categories",
  COMMENTS: "comments",
  LIKES: "likes",
  BOOKMARKS: "bookmarks",
};

const STORY_STATUS = {
  DRAFT: "draft",
  PENDING: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
  ARCHIVED: "archived",
};

function initializeConfiguration() {
  // Get configuration from window.CONFIG (loaded from config.js)
  SUPABASE_URL = window.CONFIG ? window.CONFIG.SUPABASE_URL : null;
  SUPABASE_ANON_KEY = window.CONFIG ? window.CONFIG.SUPABASE_ANON_KEY : null;

  // Validate configuration
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error(
      "Supabase configuration missing. Please check config.js file."
    );
    throw new Error(
      "Missing Supabase configuration. Please check config.js file."
    );
  }

  return true;
}

// Wait for Supabase library to be available
function initializeSupabase() {
  if (!initializeConfiguration()) {
    return false;
  }

  console.log("Attempting to initialize Supabase...");

  const SupabaseLib = window.Supabase || window.supabase;

  if (
    SupabaseLib &&
    SupabaseLib.createClient &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
  ) {
    try {
      supabase = SupabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log("Supabase client initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing Supabase:", error);
      return false;
    }
  } else {
    console.error("Supabase library not available or configuration missing");
    return false;
  }
}

// Try to initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (!initializeSupabase()) {
    console.log("Waiting for Supabase library to load...");

    let attempts = 0;
    const maxAttempts = 100;

    const checkInterval = setInterval(
      () => {
        attempts++;

        if (initializeSupabase()) {
          clearInterval(checkInterval);
          createUmojaConfig();
          console.log(
            "Supabase initialization complete after",
            attempts,
            "attempts"
          );
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.error("Supabase library failed to load within timeout");

          setTimeout(() => {
            if (initializeSupabase()) {
              createUmojaConfig();
            } else {
              console.error("Fallback initialization also failed");
            }
          }, 2000);
        }
      },
      attempts < 20 ? 100 : 200
    );
  } else {
    createUmojaConfig();
  }
});

function createUmojaConfig() {
  console.log("Creating UmojaConfig...", {
    supabase: !!supabase,
    TABLES,
    STORY_STATUS,
  });

  window.UmojaConfig = {
    supabase,
    TABLES,
    STORY_STATUS,
  };

  console.log("UmojaConfig created successfully");
}

window.createUmojaConfig = createUmojaConfig;
