# 🔒 Security Setup Guide

## Environment Variables Setup

Your Umoja AI project now uses environment variables to securely manage API keys and sensitive configuration.

### 1. Quick Setup (Already Done)

```bash
# Your credentials are now in .env.local
# Edit this file with your actual values:
VITE_SUPABASE_URL=https://iiqvqveluzicnsxushgg.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_key_here
```

### 2. Security Improvements Made

✅ **Removed hardcoded API keys** from source code
✅ **Environment variables** properly configured in Vite
✅ **Gitignore** prevents committing sensitive files
✅ **AI services** now check for proper API key configuration
✅ **Example files** created for easy setup

### 3. Files Updated

- `js/supabase-config.js` - Now uses environment variables
- `js/ai-services.js` - Now checks for OpenRouter API key
- `supabase-test.html` - Removed hardcoded credentials
- `.env.local` - Contains your actual credentials
- `.env.example` - Template for others to follow

### 4. How It Works

1. **Development**: Vite reads `.env.local` and injects values using `define` configuration
2. **Build Time**: Environment variables become `__VITE_*__` globals
3. **Runtime**: JavaScript accesses these globals safely

### 5. Best Practices

🔒 **Never commit** `.env.local` or `.env` files to version control
🔄 **Rotate keys** regularly, especially if they might be compromised  
👥 **Share example files** only (`.env.example`) with your team
🚀 **Production**: Use platform environment variables (Vercel, Netlify, etc.)

### 6. Adding New API Keys

```bash
# Add to .env.local
VITE_NEW_API_KEY=your_key_here

# Add to vite.config.js define section
__VITE_NEW_API_KEY__: JSON.stringify(process.env.VITE_NEW_API_KEY)

# Use in JavaScript
const apiKey = typeof __VITE_NEW_API_KEY__ !== 'undefined' ? __VITE_NEW_API_KEY__ : null;
```

### 7. Emergency Response

If API keys are accidentally committed:

1. **Immediately rotate** all exposed keys
2. **Remove** from git history: `git filter-branch` or BFG Repo-Cleaner
3. **Update** `.env.local` with new keys
4. **Test** application functionality

---

**⚠️ Remember**: The Supabase anonymous key in `.env.local` should be treated as sensitive even though it's meant for client-side use. It still provides access to your database according to your RLS policies.
