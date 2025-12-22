# Environment Variables Setup

## Required Environment Variables

Create or update your `.env.local` file in the root directory with:

```env
# New Supabase Project (luisdrod751@gmail.com)
NEXT_PUBLIC_SUPABASE_URL=https://bqrigkmpppkfyhnfckeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcmlna21wcHBrZnlobmZja2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNTYyMTksImV4cCI6MjA4MTkzMjIxOX0.NINb-vRXm_IisPNXRRziLpyS6JbT0djsCtmR_xZJxLY

# Service Role Key (get from Supabase Dashboard)
# Go to: https://supabase.com/dashboard/project/bqrigkmpppkfyhnfckeu/settings/api
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Getting Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/bqrigkmpppkfyhnfckeu/settings/api
2. Scroll down to "Project API keys"
3. Copy the `service_role` key (⚠️ Keep this secret!)
4. Paste it as `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

## After Updating .env.local

1. **Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache** (optional but recommended):
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

3. **Test signup:**
   - Go to http://localhost:3000/signup
   - Try creating an account
   - Should work without "Failed to fetch" error

## Troubleshooting

### "Failed to fetch" Error

**Possible causes:**
1. ❌ Environment variables not set
   - Check `.env.local` exists
   - Verify variables are correct
   - Restart dev server

2. ❌ Wrong Supabase URL/Key
   - Double-check the URL and key match the new project
   - Make sure there are no extra spaces

3. ❌ Network/CORS issue
   - Check browser console for detailed errors
   - Verify Supabase project is active

4. ❌ Supabase Auth not enabled
   - Go to Authentication > Settings
   - Ensure Email auth is enabled

### Check Configuration

Run this in browser console to verify:
```javascript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Has Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

If these show `undefined`, your `.env.local` is not being loaded.

## Verification

After setup, you should be able to:
- ✅ Sign up new accounts
- ✅ Log in
- ✅ Register unlimited devices
- ✅ Use all features without restrictions

---

**All features are free for testing!** 🎉

