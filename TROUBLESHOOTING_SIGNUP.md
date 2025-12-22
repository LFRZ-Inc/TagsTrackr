# Troubleshooting Signup Error

## Current Error
"Connection error. Please check your internet connection and ensure Supabase is configured in your .env file."

## Step-by-Step Fix

### 1. Verify .env File Location
Make sure your `.env` file is in the **root directory** (same folder as `package.json`):
```
C:\Users\cooli\OneDrive\Desktop\Documents\GitHub\TagsTrackr\.env
```

### 2. Verify .env File Contents
Open `.env` and make sure it has EXACTLY these lines (no extra spaces, no quotes):

```env
NEXT_PUBLIC_SUPABASE_URL=https://bqrigkmpppkfyhnfckeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxcmlna21wcHBrZnlobmZja2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNTYyMTksImV4cCI6MjA4MTkzMjIxOX0.NINb-vRXm_IisPNXRRziLpyS6JbT0djsCtmR_xZJxLY
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:**
- No spaces around the `=` sign
- No quotes around values
- Each value on one line
- No trailing spaces

### 3. RESTART Dev Server
**This is critical!** Next.js only loads environment variables when it starts.

1. **Stop the server completely:**
   - Press `Ctrl+C` in the terminal
   - Wait for it to fully stop

2. **Start it again:**
   ```bash
   npm run dev
   ```

3. **Wait for it to fully start** (you'll see "Ready" message)

### 4. Clear Browser Cache
- Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or open DevTools (F12) > Network tab > Check "Disable cache"

### 5. Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for any red errors
4. Check the debug info box in bottom-right corner of signup page

### 6. Test Connection
Visit this URL to test if environment variables are loaded:
```
http://localhost:3000/api/test-supabase-connection
```

You should see:
```json
{
  "configured": true,
  "url": "https://bqrigkmpppkfyhnfckeu.supabase.co",
  "hasKey": true,
  "keyLength": 200+,
  "urlMatches": true
}
```

If you see `"configured": false`, the .env file isn't being read.

## Common Issues

### Issue 1: .env file not in root
**Solution:** Move `.env` to the same folder as `package.json`

### Issue 2: Server not restarted
**Solution:** Always restart after changing .env files

### Issue 3: Wrong file name
**Solution:** Make sure it's `.env` (not `.env.txt` or `.env.local`)

### Issue 4: Syntax errors in .env
**Solution:** 
- No spaces around `=`
- No quotes needed
- One variable per line

### Issue 5: CORS/Network issue
**Solution:**
- Check if Supabase project is active
- Check browser console for CORS errors
- Try in incognito mode

## Quick Test

Run this in your terminal to verify the file exists:
```powershell
Get-Content .env
```

You should see your environment variables.

## Still Not Working?

1. **Check the debug box** on the signup page (bottom-right)
2. **Check browser console** (F12 > Console)
3. **Check Network tab** (F12 > Network) - look for failed requests to Supabase
4. **Try creating `.env.local` instead** (Next.js prefers this)

---

**Most common fix:** Restart the dev server after updating .env! 🔄

