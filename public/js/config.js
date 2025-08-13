// Umoja AI Configuration
// Uses environment variables from Vite/Vercel

window.CONFIG = {
  SUPABASE_URL:
    typeof __VITE_SUPABASE_URL__ !== "undefined"
      ? __VITE_SUPABASE_URL__
      : "https://iiqvqveluzicnsxushgg.supabase.co",
  SUPABASE_ANON_KEY:
    typeof __VITE_SUPABASE_ANON_KEY__ !== "undefined"
      ? __VITE_SUPABASE_ANON_KEY__
      : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpcXZxdmVsdXppY25zeHVzaGdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNjczMTksImV4cCI6MjA2Nzc0MzMxOX0.CcF6WLWWRHK0-TP2Rhvd2wQoqXGv9dpMTtYuAUTQl4M",
  OPENROUTER_API_KEY:
    typeof __VITE_OPENROUTER_API_KEY__ !== "undefined"
      ? __VITE_OPENROUTER_API_KEY__
      : "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",
  APP_ENV: "production",
};
