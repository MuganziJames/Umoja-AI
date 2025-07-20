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

  const SupabaseLib = window.Supabase || window.supabase;

  if (
    SupabaseLib &&
    SupabaseLib.createClient &&
    SUPABASE_URL &&
    SUPABASE_ANON_KEY
  ) {
    try {
      supabase = SupabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return true;
    } catch (error) {
      return false;
    }
  } else {
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
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);

          setTimeout(() => {
            if (initializeSupabase()) {
              createUmojaConfig();
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
  window.UmojaConfig = {
    supabase,
    TABLES,
    STORY_STATUS,
  };
}

window.createUmojaConfig = createUmojaConfig;
