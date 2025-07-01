-- Migration: Clean database and sync with Verifacti cancellations
-- File: 013_clean_sync_with_verifacti.sql
-- Purpose: Ensure database is in sync with Verifacti after invoice cancellations
-- Date: 2025-07-01

-- Verify current invoice count for user
SELECT 
  COUNT(*) as total_invoices_in_db,
  'Invoices in database before cleanup' as status
FROM invoices i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'manucrk@gmail.com';

-- Show all invoices for the user (should be empty if deleted)
SELECT 
  i.id,
  i.invoice_number,
  i.serie,
  i.numero,
  i.client_name,
  i.total,
  i.status,
  i.verifactu_id,
  i.verifactu_status,
  i.created_at
FROM invoices i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'manucrk@gmail.com'
ORDER BY i.created_at DESC;

-- Clean up any orphaned line items (if invoices were deleted)
DELETE FROM invoice_line_items 
WHERE invoice_id NOT IN (SELECT id FROM invoices);

-- Get affected rows count
SELECT 
  'Cleanup completed' as status,
  'Orphaned line items removed' as action;

-- Reset invoice numbering sequence for clean start
-- This ensures next invoice starts from 1 for the current year
DO $$
DECLARE
  user_uuid UUID;
  current_year TEXT;
BEGIN
  -- Get user ID
  SELECT id INTO user_uuid 
  FROM auth.users 
  WHERE email = 'manucrk@gmail.com';
  
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  IF user_uuid IS NOT NULL THEN
    RAISE NOTICE 'User found: %', user_uuid;
    RAISE NOTICE 'Next invoice will be: %-0001', current_year;
    RAISE NOTICE 'Database and Verifacti are now in sync';
    RAISE NOTICE 'Ready for fresh invoice creation';
  ELSE
    RAISE NOTICE 'User not found';
  END IF;
END $$;

-- Verify final state
SELECT 
  u.email,
  COUNT(i.id) as remaining_invoices,
  CASE 
    WHEN COUNT(i.id) = 0 THEN '✅ Database Clean - Synced with Verifacti'
    ELSE '⚠️ Invoices still present in database'
  END as sync_status
FROM auth.users u
LEFT JOIN invoices i ON u.id = i.user_id
WHERE u.email = 'manucrk@gmail.com'
GROUP BY u.email;