# Get Your Service Role Key

The device registration is failing because it needs the **Service Role Key** to bypass Row Level Security (RLS).

## Steps to Get Service Role Key:

1. **Go to Supabase Dashboard:**
   https://supabase.com/dashboard/project/bqrigkmpppkfyhnfckeu/settings/api

2. **Find "Project API keys" section**

3. **Copy the `service_role` key** (⚠️ Keep this secret! Never expose it to client-side code)

4. **Add it to your `.env` file:**
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

5. **Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

## Why It's Needed:

- The Service Role Key bypasses RLS policies
- Required for server-side operations like device registration
- The anon key respects RLS, which can block inserts even when policies allow them

## Security Note:

- ✅ **Safe to use in API routes** (server-side only)
- ❌ **NEVER expose in client-side code**
- ❌ **NEVER commit to git** (already in .gitignore)

---

After adding the key and restarting, device registration should work! 🎉

