# Database Options & Migration Guide

## Current Supabase Usage

Your project heavily uses Supabase-specific features:
- ✅ **Supabase Auth** - `auth.uid()`, `auth.users` table
- ✅ **Supabase Realtime** - Postgres change subscriptions for live updates
- ✅ **Row Level Security (RLS)** - Database-level security policies
- ✅ **Supabase Client Libraries** - 57+ files use Supabase

## Free Database Alternatives

### 1. **Neon PostgreSQL** (Recommended for Free Tier)
- **Free Tier:** 3GB storage, 1 project
- **Pros:**
  - PostgreSQL (same as Supabase)
  - Branching (like Git for databases)
  - Auto-scaling
  - Good free tier limits
- **Cons:**
  - No built-in Auth (need separate solution)
  - No built-in Realtime (need to implement)
  - Need to migrate RLS policies manually
- **Migration Effort:** 🔴 High (need auth + realtime replacement)

### 2. **Railway PostgreSQL**
- **Free Tier:** $5 credit/month (usually enough for small projects)
- **Pros:**
  - Easy setup
  - PostgreSQL
  - Good documentation
- **Cons:**
  - Credit-based (can run out)
  - No Auth/Realtime built-in
- **Migration Effort:** 🔴 High

### 3. **PlanetScale (MySQL)**
- **Free Tier:** 5GB storage, 1 database
- **Pros:**
  - Generous free tier
  - Serverless MySQL
  - Branching
- **Cons:**
  - MySQL (not PostgreSQL - schema changes needed)
  - No Auth/Realtime
  - Different SQL syntax
- **Migration Effort:** 🔴 Very High (different database type)

### 4. **MongoDB Atlas**
- **Free Tier:** 512MB storage
- **Pros:**
  - Document database (good for flexible schemas)
- **Cons:**
  - NoSQL (complete rewrite needed)
  - Smaller free tier than current usage
  - No Auth/Realtime
- **Migration Effort:** 🔴 Very High (complete rewrite)

### 5. **CockroachDB Serverless**
- **Free Tier:** 5GB storage, 50M request units/month
- **Pros:**
  - PostgreSQL-compatible
  - Good free tier
- **Cons:**
  - No Auth/Realtime
  - Some PostgreSQL features differ
- **Migration Effort:** 🔴 High

## Supabase Pricing

### Free Tier Limits:
- 500MB database storage ⚠️ (You've hit this)
- 1GB file storage
- 2GB bandwidth/month
- 50,000 monthly active users

### Pro Tier: $25/month
- 8GB database storage ✅
- 100GB file storage
- 250GB bandwidth/month
- 100,000 monthly active users
- Better support

## Recommendation

### Option 1: **Clean Up Data First** (Try This First!)
Before migrating, try to free up space:

```sql
-- Delete old location pings (keep last 30 days)
DELETE FROM location_pings 
WHERE recorded_at < NOW() - INTERVAL '30 days';

-- Delete old GPS pings
DELETE FROM gps_pings 
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Delete old notifications
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = true;

-- Vacuum to reclaim space
VACUUM FULL;
```

**Estimated Savings:** Could free 200-400MB if you have old data

### Option 2: **Upgrade to Supabase Pro** ($25/month)
**Worth it if:**
- ✅ You're building a real product
- ✅ You want to keep all current features
- ✅ You don't want to spend weeks migrating
- ✅ You need Auth + Realtime + RLS

**Not worth it if:**
- ❌ Just testing/learning
- ❌ No revenue/users yet
- ❌ Budget is very tight

### Option 3: **Migrate to Neon + Separate Services**
**Cost:** Free (Neon) + ~$0-10/month (Auth service)
**Time:** 2-3 weeks of work

**What you'd need:**
1. **Database:** Neon PostgreSQL (free)
2. **Auth:** Clerk ($0-25/month) or NextAuth.js (free, self-hosted)
3. **Realtime:** Ably ($0-25/month) or Socket.io (free, self-hosted)
4. **Storage:** Supabase Storage (free tier) or Cloudflare R2 (free)

**Migration Steps:**
1. Export Supabase schema
2. Import to Neon
3. Replace Supabase Auth with Clerk/NextAuth
4. Replace Realtime subscriptions with WebSockets
5. Rewrite RLS policies as application-level checks
6. Update all 57+ files using Supabase

## Quick Win: Data Cleanup Script

Create this to free up space immediately:

```sql
-- Run in Supabase SQL Editor

-- 1. Archive old location data (keep last 7 days)
CREATE TABLE IF NOT EXISTS location_pings_archive AS 
SELECT * FROM location_pings 
WHERE recorded_at < NOW() - INTERVAL '7 days';

-- 2. Delete archived data
DELETE FROM location_pings 
WHERE recorded_at < NOW() - INTERVAL '7 days';

-- 3. Keep only recent GPS pings (last 30 days)
DELETE FROM gps_pings 
WHERE timestamp < NOW() - INTERVAL '30 days';

-- 4. Clean up old notifications
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = true;

-- 5. Clean up old check-ins (if exists)
DELETE FROM check_ins 
WHERE created_at < NOW() - INTERVAL '90 days';

-- 6. Vacuum to reclaim space
VACUUM ANALYZE;

-- 7. Check current database size
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size;
```

## My Recommendation

**For your situation:**

1. **First:** Run the cleanup script above - you might free enough space
2. **If still full:** 
   - If this is a real product → **Upgrade to Supabase Pro ($25/month)**
   - If just testing → **Migrate to Neon** (but expect 2-3 weeks of work)

**Why Supabase Pro is worth $25/month:**
- Saves 2-3 weeks of migration work
- Keeps all features working
- Better than spending time migrating instead of building features
- Can always migrate later if needed

**Why Neon might be better:**
- Free forever (if you stay under 3GB)
- Good for learning/testing
- More control over your database

## Next Steps

1. **Try cleanup first** - Run the SQL script above
2. **Check your usage** - See what's taking up space
3. **Decide:** Upgrade or migrate based on your goals

Would you like me to:
- Create a data cleanup script?
- Help migrate to Neon?
- Optimize your database schema to use less space?

