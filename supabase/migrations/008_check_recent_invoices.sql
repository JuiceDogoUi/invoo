-- Migration: Check recent invoices and VeriFactu submission status
-- File: 008_check_recent_invoices.sql
-- Purpose: Query recent invoices for manucrk@gmail.com to debug VeriFactu integration
-- Date: 2025-07-01

-- Display recent invoices for the test user
SELECT 
  i.id,
  i.invoice_number,
  i.serie,
  i.numero,
  i.client_name,
  i.client_tax_id,
  i.total,
  i.status,
  i.created_at,
  i.verifactu_id,
  i.verifactu_status,
  i.verifactu_hash,
  i.last_submission_error,
  i.submission_retry_count,
  u.email as user_email
FROM invoices i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'manucrk@gmail.com'
ORDER BY i.created_at DESC
LIMIT 10;

-- Also show line items for the most recent invoice
SELECT 
  'Line Items for most recent invoice:' as info;

SELECT 
  li.description,
  li.quantity,
  li.unit_price,
  li.tax_rate,
  li.total,
  i.invoice_number
FROM invoice_line_items li
JOIN invoices i ON li.invoice_id = i.id
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'manucrk@gmail.com'
  AND i.id = (
    SELECT id 
    FROM invoices 
    WHERE user_id = u.id 
    ORDER BY created_at DESC 
    LIMIT 1
  )
ORDER BY li.id;

-- Show user profile information
SELECT 
  'User Profile Information:' as info;

SELECT 
  u.email,
  p.company_name,
  p.tax_id,
  p.verifactu_api_key,
  p.verifactu_nif_activated
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'manucrk@gmail.com';

-- Count total invoices for user
SELECT 
  'Total invoice count:' as info,
  COUNT(*) as total_invoices
FROM invoices i
JOIN auth.users u ON i.user_id = u.id
WHERE u.email = 'manucrk@gmail.com';