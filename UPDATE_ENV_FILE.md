# Update Your .env File

Since you're using `.env` (not `.env.local`), please update it with these values:

## Steps:

1. **Open or create `.env` file** in the root directory (same folder as `package.json`)

2. **Add/Update these lines:**

```env
# Supabase Configuration - New Project
NEXT_PUBLIC_SUPABASE_URL=https://bqrigkmpppkfyhnfckeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcmlna21wcHBrZnlobmZja2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNTYyMTksImV4cCI6MjA4MTkzMjIxOX0.NINb-vRXm_IisPNXRRziLpyS6JbT0djsCtmR_xZJxLY

# Service Role Key (optional for now, get from Supabase Dashboard)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. **Save the file**

4. **IMPORTANT: Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

5. **Clear browser cache** (optional):
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

## Verify It's Working:

After restarting, the signup page should work without the "Supabase is not configured" error.

## If Still Not Working:

1. Make sure `.env` is in the root directory (same level as `package.json`)
2. Make sure there are no spaces around the `=` sign
3. Make sure the values are on one line (no line breaks in the middle)
4. Restart the dev server completely
5. Check browser console for any errors

---

**The .env file should be in:** `C:\Users\cooli\OneDrive\Desktop\Documents\GitHub\TagsTrackr\.env`

