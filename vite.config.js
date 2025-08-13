import { defineConfig } from "vite";

export default defineConfig({
  // Set the base URL for Vercel deployment
  base: "/",

  // Build configuration
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: "./index.html",
        auth: "./pages/auth.html",
        stories: "./pages/stories.html",
        submit: "./pages/submit.html",
        about: "./pages/about.html",
        contact: "./pages/contact.html",
        chat: "./pages/chat.html",
        profile: "./pages/profile.html",
        success: "./pages/success.html",
      },
    },
    // Copy JS and CSS files as static assets
    copyPublicDir: true,
  },

  // Configure public directory
  publicDir: "public",

  // Development server configuration
  server: {
    port: 3000,
    open: true,
  },

  // Environment variables configuration
  envPrefix: "VITE_",

  // Handle legacy browser compatibility and inject env vars
  define: {
    global: "globalThis",
    // Inject environment variables for script tags
    __VITE_SUPABASE_URL__: JSON.stringify(process.env.VITE_SUPABASE_URL),
    __VITE_SUPABASE_ANON_KEY__: JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY
    ),
    __VITE_OPENROUTER_API_KEY__: JSON.stringify(
      process.env.VITE_OPENROUTER_API_KEY
    ),
  },
});
