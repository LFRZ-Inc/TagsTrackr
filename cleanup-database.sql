-- Database Cleanup Script for Supabase
-- Run this in Supabase SQL Editor to free up space
-- WARNING: This will delete old data. Make sure you have backups if needed.

-- ============================================
-- 1. CHECK CURRENT DATABASE SIZE
-- ============================================
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as current_database_size,
  pg_size_pretty(
    (SELECT sum(pg_total_relation_size(schemaname||'.'||tablename)) 
     FROM pg_tables 
     WHERE schemaname = 'public')
  ) as total_table_size;

-- ============================================
-- 2. CHECK TABLE SIZES
-- ============================================
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- 3. COUNT RECORDS BEFORE CLEANUP
-- ============================================
SELECT 
  'location_pings' as table_name,
  COUNT(*) as record_count,
  MIN(recorded_at) as oldest_record,
  MAX(recorded_at) as newest_record
FROM location_pings
UNION ALL
SELECT 
  'gps_pings' as table_name,
  COUNT(*) as record_count,
  MIN(timestamp) as oldest_record,
  MAX(timestamp) as newest_record
FROM gps_pings
UNION ALL
SELECT 
  'notifications' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM notifications;

-- ============================================
-- 4. DELETE OLD LOCATION PINGS (Keep last 30 days)
-- ============================================
-- This is usually the biggest table
DELETE FROM location_pings 
WHERE recorded_at < NOW() - INTERVAL '30 days';

-- Check how many were deleted
-- SELECT COUNT(*) FROM location_pings WHERE recorded_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 5. DELETE OLD GPS PINGS (Keep last 30 days)
-- ============================================
DELETE FROM gps_pings 
WHERE timestamp < NOW() - INTERVAL '30 days';

-- ============================================
-- 6. DELETE OLD READ NOTIFICATIONS (Keep last 90 days)
-- ============================================
DELETE FROM notifications 
WHERE created_at < NOW() - INTERVAL '90 days' 
  AND is_read = true;

-- ============================================
-- 7. DELETE OLD PLACE EVENTS (Keep last 90 days)
-- ============================================
-- Only if this table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'place_events') THEN
    DELETE FROM place_events 
    WHERE recorded_at < NOW() - INTERVAL '90 days';
  END IF;
END $$;

-- ============================================
-- 8. DELETE OLD CHECK-INS (Keep last 90 days)
-- ============================================
-- Only if this table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'check_ins') THEN
    DELETE FROM check_ins 
    WHERE created_at < NOW() - INTERVAL '90 days';
  END IF;
END $$;

-- ============================================
-- 9. DELETE OLD PING LOGS (Keep last 7 days)
-- ============================================
-- Only if this table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pings_log') THEN
    DELETE FROM pings_log 
    WHERE created_at < NOW() - INTERVAL '7 days'
      AND processing_status = 'processed';
  END IF;
END $$;

-- ============================================
-- 10. VACUUM TO RECLAIM SPACE
-- ============================================
-- This reclaims space from deleted rows
VACUUM ANALYZE;

-- For more aggressive cleanup (requires exclusive lock, run during low traffic):
-- VACUUM FULL;

-- ============================================
-- 11. CHECK DATABASE SIZE AFTER CLEANUP
-- ============================================
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as database_size_after_cleanup;

-- ============================================
-- 12. CHECK TABLE SIZES AFTER CLEANUP
-- ============================================
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size('public.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC;

-- ============================================
-- OPTIONAL: CREATE RETENTION POLICY FUNCTION
-- ============================================
-- This function can be run periodically to keep data size manageable
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete location pings older than 30 days
  DELETE FROM location_pings 
  WHERE recorded_at < NOW() - INTERVAL '30 days';
  
  -- Delete GPS pings older than 30 days
  DELETE FROM gps_pings 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Delete old read notifications
  DELETE FROM notifications 
  WHERE created_at < NOW() - INTERVAL '90 days' 
    AND is_read = true;
  
  -- Vacuum
  VACUUM ANALYZE;
END;
$$ LANGUAGE plpgsql;

-- You can schedule this to run automatically using pg_cron (if available)
-- Or call it manually: SELECT cleanup_old_data();

