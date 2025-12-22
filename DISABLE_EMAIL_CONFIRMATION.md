# Disable Email Confirmation for Testing

To allow users to sign in immediately without email confirmation:

## Option 1: Disable in Supabase Dashboard (Recommended for Testing)

1. Go to your Supabase project: https://supabase.com/dashboard/project/bqrigkmpppkfyhnfckeu
2. Navigate to **Authentication** > **Providers** > **Email**
3. Find **"Confirm email"** setting
4. **Toggle it OFF** (disable email confirmation)
5. Save changes

After this, new users can sign in immediately after signup without confirming their email.

## Option 2: Manually Confirm Users (For Existing Users)

If you already have users who need to be confirmed, you can use the admin endpoint:

```bash
# Confirm a user manually
curl -X POST http://localhost:3000/api/admin/confirm-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "adminKey": "tagstrackr-admin-reset-2024"
  }'
```

Or visit: http://localhost:3000/admin-reset (if that page exists)

## Option 3: Auto-Confirm in Signup (Development Only)

For development, you can modify the signup to auto-confirm, but this requires service role key access.

---

**For testing purposes, Option 1 is the easiest!** Just disable email confirmation in the Supabase dashboard.

