# ElectriScribe MVP Setup Guide

**⚠️ CRITICAL: The refactored code won't run without completing these steps!**

---

## Current Status

✅ **Code Structure:** Complete (Phases 1-3b done)
❌ **Supabase Connection:** NOT configured
❌ **Database Migrations:** NOT applied
❌ **Environment Variables:** NOT set

**Result:** App will crash on startup with "Missing Supabase environment variables"

---

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works fine)
- Supabase project created (or create one at https://supabase.com)

---

## Step 1: Set Up Supabase Project

### Option A: Create New Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name:** ElectriScribe
   - **Database Password:** (save this securely)
   - **Region:** Choose closest to you
4. Wait ~2 minutes for project to provision
5. Note your **Project URL** and **anon public** API key from Settings → API

### Option B: Use Existing Project

1. Go to your Supabase dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

---

## Step 2: Configure Environment Variables

### Create .env file

```bash
cp .env.example .env
```

### Edit .env with your actual credentials

```bash
# .env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Python API (not needed for Phase 3 MVP)
VITE_PYTHON_API_URL=http://localhost:8000
```

**⚠️ IMPORTANT:** Never commit .env to git (already in .gitignore)

---

## Step 3: Install Supabase CLI (Required for Migrations)

```bash
# Install globally
npm install -g supabase

# Verify installation
supabase --version
```

---

## Step 4: Link Project to Supabase

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

**Where to find PROJECT_REF:**
- Go to Supabase Dashboard → Settings → General
- Look for "Reference ID" (e.g., `abcdefghijklmnop`)

---

## Step 5: Apply Database Migrations

We have 5 migrations to apply:

```bash
# View migrations that will be applied
supabase db diff

# Apply all migrations
supabase db push
```

**Migrations that will run:**
1. `20251001082134_initial_schema.sql` - Initial tables
2. `20251001162036_create_task_management_system.sql` - Task tables (dormant)
3. `20251001164116_add_knowledge_persistence_and_optimization.sql` - Knowledge tables (dormant)
4. `20251001184242_create_field_notes_and_entities_schema.sql` - **MVP ACTIVE tables**
5. `20251116_add_mvp_database_documentation.sql` - **Documentation & views**

**Expected output:**
```
Applying migration 20251001082134_initial_schema.sql...
Applying migration 20251001162036_create_task_management_system.sql...
Applying migration 20251001164116_add_knowledge_persistence_and_optimization.sql...
Applying migration 20251001184242_create_field_notes_and_entities_schema.sql...
Applying migration 20251116_add_mvp_database_documentation.sql...
✓ All migrations applied successfully
```

---

## Step 6: Verify Database Setup

### Check tables were created

Go to Supabase Dashboard → Table Editor

You should see **38 tables total:**
- 7 MVP ACTIVE tables (green): user_profiles, field_notes, parsed_panels, parsed_circuits, parsed_loads, parsed_issues, mwbc_configurations
- 31 DORMANT tables (documented in Phase 2)

### Check views were created

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Should return 7 rows
SELECT * FROM get_mvp_active_tables();

-- Should show panel documentation view
SELECT * FROM mvp_panel_documentation LIMIT 1;
```

---

## Step 7: Set Up Authentication

### Enable Email Authentication

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable "Email" provider
3. **Disable** email confirmations for testing:
   - Go to Authentication → Settings
   - Uncheck "Enable email confirmations"
   - Click Save

### Create Test User

Option A: Via Dashboard
1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. User created ✓

Option B: Via SQL
```sql
-- Run in SQL Editor
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  'test@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- Create user profile (required by RLS policies)
INSERT INTO public.user_profiles (id, email, full_name, role)
SELECT id, email, 'Test User', 'journeyman'
FROM auth.users
WHERE email = 'test@example.com';
```

---

## Step 8: Run the Application

```bash
# Install dependencies (if not already done)
npm install

# Start dev server
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### Verify it works

1. Open http://localhost:5173/
2. You should see **PanelListPage** (empty state)
3. No console errors related to Supabase
4. Click "New Panel" → Should navigate to /panel/new

---

## Step 9: Test Database Connection

### Option A: Use ElectriScribeDesigner (Old Page)

1. Navigate to http://localhost:5173/designer
2. Paste sample field notes (click "Load Example")
3. Parse field notes
4. Click "Save to Database"
5. Check Supabase Dashboard → Table Editor → field_notes
6. Should see new row ✓

### Option B: Manual SQL Test

```sql
-- Run in Supabase SQL Editor
-- Should return your test user
SELECT * FROM user_profiles;

-- Should return empty (no panels yet)
SELECT * FROM field_notes;
```

---

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Cause:** .env file not created or not loaded

**Fix:**
```bash
# Verify .env exists
cat .env

# Should show your actual URL and key
# If it shows "your_supabase_project_url", you forgot to edit it!

# Restart dev server after editing .env
npm run dev
```

### Error: "relation 'field_notes' does not exist"

**Cause:** Migrations not applied

**Fix:**
```bash
supabase db push
```

### Error: "JWT expired" or Auth errors

**Cause:** User not created or RLS policies blocking

**Fix:**
```sql
-- Disable RLS temporarily for testing (NOT for production!)
ALTER TABLE field_notes DISABLE ROW LEVEL SECURITY;

-- Or create proper user profile
INSERT INTO user_profiles (id, email, full_name)
SELECT id, email, 'Test User'
FROM auth.users
WHERE email = 'your@email.com';
```

### Error: "Failed to fetch"

**Cause:** Supabase project paused (free tier auto-pauses after 1 week inactivity)

**Fix:**
1. Go to Supabase Dashboard
2. Click "Restore" if project is paused
3. Wait 2-3 minutes for project to wake up

---

## What's Next?

Once setup is complete, you have:

✅ **Working MVP foundation**
- 3 functional pages (list, new, detail)
- 7 active database tables
- Authentication ready
- RLS policies protecting data

🚧 **Still needed for Phase 4:**
- Camera integration (useCamera hook)
- PaddleOCR processing (ocr-processor service)
- Offline storage (Dexie.js setup)
- Photo compression and storage
- Sync manager (Last-Write-Wins)

---

## Quick Start (TL;DR)

```bash
# 1. Create .env
cp .env.example .env
# Edit .env with your Supabase URL and anon key

# 2. Install Supabase CLI
npm install -g supabase

# 3. Link and push migrations
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# 4. Create test user in Supabase Dashboard

# 5. Run app
npm install
npm run dev

# 6. Open http://localhost:5173/
```

---

## Need Help?

- **Supabase Docs:** https://supabase.com/docs
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli
- **ElectriScribe Refactoring Plan:** See REFACTORING_PLAN.md
- **Database Schema:** See DATABASE_SIMPLIFICATION_PLAN.md

---

**Last Updated:** 2025-11-16
**Status:** Setup required before app will run
**Estimated Setup Time:** 15-20 minutes
